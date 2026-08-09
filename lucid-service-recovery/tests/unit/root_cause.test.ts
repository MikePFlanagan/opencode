import { describe, expect, test } from "bun:test"
import { analyzeRootCauses } from "../../src/diagnostics/root_cause_engine"
import { emptyVehicleState } from "../../src/vehicle/lucid/state_model"

describe("root cause engine", () => {
  test("ranks OEM auth for crash salvage service mode", () => {
    const state = emptyVehicleState({
      serviceMode: "crash_salvage_service",
      serviceModeSources: ["CGW"],
      lvBatteryMv: 12600,
      hvState: "ready",
      otaStatus: "idle",
      gatewayHealthy: true,
      ignitionPower: "on",
      ecus: [],
    })
    const results = analyzeRootCauses(state)
    expect(results[0]?.category).toBe("oem_backend_authorization_required")
    expect(results[0]?.localCorrectionPossible).toBe(false)
  })

  test("detects low 12v", () => {
    const state = emptyVehicleState({
      serviceMode: "none",
      lvBatteryMv: 10800,
      gatewayHealthy: false,
      ignitionPower: "on",
      hvState: "ready",
      otaStatus: "idle",
      ecus: [
        {
          name: "ZONE_FL",
          logicalAddress: 1,
          online: false,
          session: "unknown",
          dids: [],
          dtcs: [],
          communicationFailure: true,
        },
      ],
    })
    const results = analyzeRootCauses(state)
    expect(results.some((r) => r.category === "low_12v" && r.score >= 60)).toBe(true)
  })
})
