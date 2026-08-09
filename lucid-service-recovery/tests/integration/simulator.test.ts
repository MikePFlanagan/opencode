import { describe, expect, test, beforeEach } from "bun:test"
import { auditReset, auditList } from "../../src/audit/command_audit"
import { scanVehicle } from "../../src/diagnostics/scanner"
import { analyzeRootCauses } from "../../src/diagnostics/root_cause_engine"
import { createSimulator } from "../../src/simulator/vehicle_sim"
import { executeSafeAction, listSafeActions } from "../../src/recovery/safe_actions"
import { refuseSecurityAccessSendKey } from "../../src/protocol/uds/services"
import { UdsClient } from "../../src/protocol/uds/client"
import { runRecoveryWizard } from "../../src/ui/wizard"
import { buildEscalationPackage, toJsonBundle, toHumanReport } from "../../src/reports/escalation"

describe("simulator integration", () => {
  beforeEach(() => {
    auditReset()
  })

  test("service-mode-oem-auth scan + boundary", async () => {
    const transport = createSimulator("service-mode-oem-auth")
    await transport.open()
    const state = await scanVehicle({ transport, scenarioHint: "service-mode-oem-auth" })
    expect(state.serviceMode).toBe("crash_salvage_service")
    const hypotheses = analyzeRootCauses(state)
    expect(hypotheses[0]?.oemAuthorizationLikely).toBe(true)

    const actions = listSafeActions(state)
    const probe = actions.find((a) => a.id === "probe-oem-mode-clear")
    expect(probe?.available).toBe(true)

    const result = await executeSafeAction({
      action: probe!,
      transport,
      state,
      mode: "simulate",
      simulatorSuitePassed: true,
      liveWriteEnabled: true,
      approve: async () => true,
    })
    expect(result.authorizationRequired).toBe(true)
    expect(result.detail).toContain("OEM AUTHORIZATION REQUIRED")
    expect(auditList().some((a) => a.phase === "executed")).toBe(true)
    await transport.close()
  })

  test("active diagnostic session can be ended locally", async () => {
    const transport = createSimulator("active-diagnostic-session")
    await transport.open()
    const state = await scanVehicle({
      transport,
      scenarioHint: "active-diagnostic-session",
      includeExtendedSessionProbe: false,
    })
    // VCU starts in extended in this scenario via ACTIVE_SESSION DID
    const vcu = state.ecus.find((e) => e.name === "VCU")
    expect(vcu?.session).toBe("extended")
    expect(state.serviceMode).toBe("active_diagnostic_session")

    const end = listSafeActions(state).find((a) => a.id === "end-session-VCU")
    expect(end).toBeDefined()
    const result = await executeSafeAction({
      action: end!,
      transport,
      state,
      mode: "simulate",
      simulatorSuitePassed: true,
      liveWriteEnabled: true,
      approve: async () => true,
    })
    expect(result.success).toBe(true)

    const client = new UdsClient(transport, vcu!.logicalAddress, "VCU")
    const sessionRaw = await client.readDataByIdentifier(0xf186)
    expect(sessionRaw[0]).toBe(0x01)

    const after = await scanVehicle({ transport, scenarioHint: "active-diagnostic-session" })
    expect(after.serviceMode).toBe("none")
    expect(analyzeRootCauses(after).every((h) => !(h.category === "diagnostic_session_left_active" && h.score >= 50))).toBe(true)
    await transport.close()
  })

  test("never sends security key", () => {
    expect(() => refuseSecurityAccessSendKey()).toThrow(/OEM AUTHORIZATION REQUIRED/)
  })

  test("live-readonly blocks writes", async () => {
    const transport = createSimulator("active-diagnostic-session")
    await transport.open()
    const state = await scanVehicle({ transport, scenarioHint: "active-diagnostic-session" })
    const end = listSafeActions(state).find((a) => a.id.startsWith("end-session-"))
    const result = await executeSafeAction({
      action: end!,
      transport,
      state,
      mode: "live-readonly",
      simulatorSuitePassed: true,
      liveWriteEnabled: false,
      approve: async () => true,
    })
    expect(result.success).toBe(false)
    expect(result.detail).toMatch(/live-readonly/)
    await transport.close()
  })

  test("wizard oem scenario writes escalation package", async () => {
    const outDir = `${import.meta.dir}/../../artifacts/test-wizard`
    const result = await runRecoveryWizard({
      scenario: "service-mode-oem-auth",
      mode: "simulate",
      autoApprove: true,
      outDir,
      vin: "TESTVINDO NOTUSE000",
    })
    expect(result.oemAuthorizationRequired).toBe(true)
    expect(result.escalationPaths?.md).toBeTruthy()
    const md = await Bun.file(result.escalationPaths!.md).text()
    expect(md).toContain("OEM authorization required: YES")
    expect(md).toContain("TESTVINDO NOTUSE000")
  })

  test("escalation json roundtrip", async () => {
    const transport = createSimulator("interrupted-update")
    await transport.open()
    const state = await scanVehicle({ transport, scenarioHint: "interrupted-update" })
    const pkg = buildEscalationPackage({ state, hypotheses: analyzeRootCauses(state) })
    const json = toJsonBundle(pkg)
    expect(JSON.parse(json).serviceMode).toBe("maintenance_lock")
    expect(toHumanReport(pkg)).toContain("Interrupted OTA")
    await transport.close()
  })

  test("low-12v and failed-ecu scenarios classify", async () => {
    for (const scenario of ["low-12v", "failed-ecu", "hv-fault"] as const) {
      const transport = createSimulator(scenario)
      await transport.open()
      const state = await scanVehicle({ transport, scenarioHint: scenario })
      const hypotheses = analyzeRootCauses(state)
      expect(hypotheses.length).toBeGreaterThan(0)
      await transport.close()
    }
  })
})
