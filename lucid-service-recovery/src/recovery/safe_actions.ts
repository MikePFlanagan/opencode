import { auditAppend, auditPropose } from "../audit/command_audit"
import { UdsClient, UdsNegativeResponseError } from "../protocol/uds/client"
import {
  buildClearDiagnosticInformation,
  buildDiagnosticSessionControl,
  buildEcuReset,
} from "../protocol/uds/services"
import { createLogger } from "../shared/log"
import type { OperatingMode, RiskLevel } from "../shared/types"
import type { UdsTransport } from "../transport/types"
import { ecuByName } from "../vehicle/lucid/ecu_registry"
import type { VehicleState } from "../vehicle/lucid/state_model"
import { probeModeClearAuthorization, formatAuthorizationBoundary } from "./authorization_boundary"
import { checkRecoveryPrerequisites } from "./prerequisite_checker"
import { nrcName } from "../protocol/uds/nrc"

const log = createLogger("recovery.safe_actions")

export interface SafeAction {
  id: string
  title: string
  ecu: string
  service: string
  payload: Uint8Array
  effect: string
  risk: RiskLevel
  available: boolean
  unavailableReason?: string
}

export interface ActionExecutionResult {
  actionId: string
  success: boolean
  detail: string
  nrc?: number
  authorizationRequired?: boolean
  authorizationText?: string
}

const RESET_ALLOWLIST = new Set(["CGW", "VCU", "IC", "ZONE_FL"])

export function listSafeActions(state: VehicleState): SafeAction[] {
  const actions: SafeAction[] = []

  for (const ecu of state.ecus.filter((e) => e.online && e.session === "extended")) {
    actions.push({
      id: `end-session-${ecu.name}`,
      title: `End extended diagnostic session on ${ecu.name}`,
      ecu: ecu.name,
      service: "DiagnosticSessionControl (0x10) → default (0x01)",
      payload: buildDiagnosticSessionControl("default"),
      effect: "Returns ECU to default session; may restore normal communication behavior",
      risk: "low",
      available: true,
    })
  }

  for (const ecu of state.ecus.filter((e) => e.online && RESET_ALLOWLIST.has(e.name))) {
    actions.push({
      id: `soft-reset-${ecu.name}`,
      title: `Soft ECUReset on ${ecu.name}`,
      ecu: ecu.name,
      service: "ECUReset (0x11) subFunction soft (0x03)",
      payload: buildEcuReset("soft"),
      effect: "Requests soft reset of non-safety-critical module",
      risk: "medium",
      available: ecu.name !== "BMS" && ecu.name !== "ADAS",
      unavailableReason: ecu.name === "BMS" || ecu.name === "ADAS" ? "Safety-critical module excluded" : undefined,
    })
  }

  const clearable = state.ecus.filter((e) => e.online && e.dtcs.some((d) => !d.safetyCritical))
  for (const ecu of clearable) {
    actions.push({
      id: `clear-nonsafety-dtc-${ecu.name}`,
      title: `Clear non-safety DTCs on ${ecu.name}`,
      ecu: ecu.name,
      service: "ClearDiagnosticInformation (0x14)",
      payload: buildClearDiagnosticInformation(0xffffff),
      effect: "Attempts DTC clear; ECU may reject if safety conditions exist",
      risk: "medium",
      available: true,
    })
  }

  actions.push({
    id: "probe-oem-mode-clear",
    title: "Probe Service Mode clear authorization boundary (seed only)",
    ecu: "CGW",
    service: "SecurityAccess (0x27) requestSeed — NO KEY SEND",
    payload: new Uint8Array([0x27, 0x01]),
    effect: "Documents OEM authorization requirement without unlocking",
    risk: "low",
    available: state.serviceMode === "crash_salvage_service" || state.serviceMode === "service_transport" || state.serviceMode === "maintenance_lock",
    unavailableReason: "No OEM-locked mode indication",
  })

  return actions
}

export async function executeSafeAction(input: {
  action: SafeAction
  transport: UdsTransport
  state: VehicleState
  mode: OperatingMode
  simulatorSuitePassed: boolean
  liveWriteEnabled: boolean
  approve: (action: SafeAction) => boolean | Promise<boolean>
}): Promise<ActionExecutionResult> {
  const prereq = checkRecoveryPrerequisites({
    state: input.state,
    mode: input.mode,
    actionId: input.action.id,
    simulatorSuitePassed: input.simulatorSuitePassed,
    liveWriteEnabled: input.liveWriteEnabled,
  })

  auditPropose({
    mode: input.mode,
    ecu: input.action.ecu,
    service: input.action.service,
    payload: input.action.payload,
    effect: input.action.effect,
    risk: input.action.risk,
    prerequisitesOk: prereq.ok,
  })

  if (!input.action.available) {
    auditAppend({
      phase: "skipped",
      mode: input.mode,
      ecu: input.action.ecu,
      service: input.action.service,
      payloadHex: "",
      effect: input.action.effect,
      risk: input.action.risk,
      prerequisitesOk: false,
      result: input.action.unavailableReason,
    })
    return { actionId: input.action.id, success: false, detail: input.action.unavailableReason ?? "unavailable" }
  }

  if (input.mode === "live-readonly") {
    const detail = "State-changing action blocked in live-readonly mode"
    auditAppend({
      phase: "denied",
      mode: input.mode,
      ecu: input.action.ecu,
      service: input.action.service,
      payloadHex: "",
      effect: input.action.effect,
      risk: input.action.risk,
      prerequisitesOk: prereq.ok,
      operatorApproval: false,
      result: detail,
    })
    return { actionId: input.action.id, success: false, detail }
  }

  if (!prereq.ok) {
    return {
      actionId: input.action.id,
      success: false,
      detail: `Prerequisites failed: ${prereq.checks.filter((c) => !c.ok).map((c) => c.name).join(", ")}`,
    }
  }

  const approved = await input.approve(input.action)
  auditAppend({
    phase: approved ? "approved" : "denied",
    mode: input.mode,
    ecu: input.action.ecu,
    service: input.action.service,
    payloadHex: "",
    effect: input.action.effect,
    risk: input.action.risk,
    prerequisitesOk: true,
    operatorApproval: approved,
  })
  if (!approved) {
    return { actionId: input.action.id, success: false, detail: "Operator denied action" }
  }

  if (input.action.id === "probe-oem-mode-clear") {
    const boundary = await probeModeClearAuthorization(input.transport)
    const text = formatAuthorizationBoundary(boundary)
    auditAppend({
      phase: "executed",
      mode: input.mode,
      ecu: input.action.ecu,
      service: input.action.service,
      payloadHex: "",
      effect: input.action.effect,
      risk: input.action.risk,
      prerequisitesOk: true,
      operatorApproval: true,
      result: boundary.message,
    })
    return {
      actionId: input.action.id,
      success: true,
      detail: text,
      authorizationRequired: true,
      authorizationText: text,
    }
  }

  const addr = ecuByName(input.action.ecu)
  const client = new UdsClient(input.transport, addr.logicalAddress, addr.name)

  try {
    if (input.action.id.startsWith("end-session-")) {
      await client.diagnosticSessionControl("default")
    } else if (input.action.id.startsWith("soft-reset-")) {
      await client.ecuReset("soft")
    } else if (input.action.id.startsWith("clear-nonsafety-dtc-")) {
      await client.rawRequest(input.action.payload)
    } else {
      throw new Error(`Unknown allow-listed action ${input.action.id}`)
    }

    auditAppend({
      phase: "executed",
      mode: input.mode,
      ecu: input.action.ecu,
      service: input.action.service,
      payloadHex: "",
      effect: input.action.effect,
      risk: input.action.risk,
      prerequisitesOk: true,
      operatorApproval: true,
      result: "positive response",
    })
    log.info("safe action executed", { action: input.action.id })
    return { actionId: input.action.id, success: true, detail: "positive response" }
  } catch (error) {
    const nrc = error instanceof UdsNegativeResponseError ? error.nrc : undefined
    const detail =
      error instanceof UdsNegativeResponseError
        ? `NRC 0x${nrc!.toString(16)} (${nrcName(nrc!)})`
        : error instanceof Error
          ? error.message
          : String(error)
    const authorizationRequired = nrc === 0x33
    auditAppend({
      phase: "failed",
      mode: input.mode,
      ecu: input.action.ecu,
      service: input.action.service,
      payloadHex: "",
      effect: input.action.effect,
      risk: input.action.risk,
      prerequisitesOk: true,
      operatorApproval: true,
      result: detail,
      nrc,
    })
    return {
      actionId: input.action.id,
      success: false,
      detail: authorizationRequired ? `OEM AUTHORIZATION REQUIRED — ${detail}` : detail,
      nrc,
      authorizationRequired,
    }
  }
}
