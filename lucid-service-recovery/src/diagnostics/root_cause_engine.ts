import type { CauseCategory, Confidence } from "../shared/types"
import type { VehicleState } from "../vehicle/lucid/state_model"

export interface CauseHypothesis {
  category: CauseCategory
  confidence: Confidence
  score: number
  summary: string
  supportingEvidence: string[]
  contradictingEvidence: string[]
  safeNextStep: string
  localCorrectionPossible: boolean
  oemAuthorizationLikely: boolean
}

export function analyzeRootCauses(state: VehicleState): CauseHypothesis[] {
  const hypotheses: CauseHypothesis[] = []

  hypotheses.push(evalOemServiceMode(state))
  hypotheses.push(evalLow12v(state))
  hypotheses.push(evalInterruptedUpdate(state))
  hypotheses.push(evalGatewayNetwork(state))
  hypotheses.push(evalActiveDiagnosticSession(state))
  hypotheses.push(evalTransportConfig(state))
  hypotheses.push(evalHvFault(state))
  hypotheses.push(evalEcuFault(state))
  hypotheses.push(evalMaintenanceLock(state))

  return hypotheses
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
}

function evalOemServiceMode(state: VehicleState): CauseHypothesis {
  const supporting: string[] = []
  const contradicting: string[] = []
  let score = 0

  if (state.serviceMode === "crash_salvage_service") {
    score += 80
    supporting.push("CGW service mode flags indicate crash/salvage Service Mode [INFERRED from simulated DID]")
    supporting.push("Owner/public reports: salvage/crash Service Mode typically needs Lucid authorization [CONFIRMED reports]")
  }
  if (state.ecus.some((e) => e.dtcs.some((d) => d.description.toLowerCase().includes("service mode")))) {
    score += 10
    supporting.push("DTC text references Service Mode")
  }
  if (state.serviceMode === "none") {
    contradicting.push("No Service Mode flag detected")
  }

  return {
    category: "oem_backend_authorization_required",
    confidence: score >= 70 ? "likely" : score > 0 ? "inferred" : "unknown",
    score,
    summary: "OEM/backend-authorized Service Mode lockout",
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    safeNextStep:
      "Complete read-only scan, generate escalation package, contact Lucid service with package. Do not attempt SecurityAccess key calculation.",
    localCorrectionPossible: false,
    oemAuthorizationLikely: true,
  }
}

function evalLow12v(state: VehicleState): CauseHypothesis {
  const supporting: string[] = []
  const contradicting: string[] = []
  let score = 0
  if (state.lvBatteryMv !== undefined && state.lvBatteryMv < 11800) {
    score += 70
    supporting.push(`LV battery ${state.lvBatteryMv} mV below healthy threshold`)
  }
  if (!state.gatewayHealthy) {
    score += 15
    supporting.push("Gateway health degraded")
  }
  if (state.ecus.some((e) => e.communicationFailure)) {
    score += 10
    supporting.push("One or more ECUs failed to respond")
  }
  if (state.lvBatteryMv !== undefined && state.lvBatteryMv >= 12400) {
    contradicting.push("LV voltage appears healthy")
    score = Math.max(0, score - 40)
  }
  return {
    category: "low_12v",
    confidence: score >= 60 ? "likely" : score > 0 ? "inferred" : "unknown",
    score,
    summary: "Low 12V supply causing module/gateway instability",
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    safeNextStep: "Stabilize 12V per owner manual jump points; re-scan before any recovery action",
    localCorrectionPossible: true,
    oemAuthorizationLikely: false,
  }
}

function evalInterruptedUpdate(state: VehicleState): CauseHypothesis {
  const supporting: string[] = []
  let score = 0
  if (state.otaStatus === "failed_interrupted") {
    score += 75
    supporting.push("OTA status = failed/interrupted")
  }
  if (state.serviceMode === "maintenance_lock") {
    score += 20
    supporting.push("Maintenance lock flag set")
  }
  if (state.ecus.some((e) => e.dtcs.some((d) => d.description.toLowerCase().includes("update")))) {
    score += 10
    supporting.push("DTC mentions incomplete software update")
  }
  return {
    category: "interrupted_software_update",
    confidence: score >= 70 ? "likely" : score > 0 ? "inferred" : "unknown",
    score,
    summary: "Interrupted OTA/software update left vehicle in restricted state",
    supportingEvidence: supporting,
    contradictingEvidence: state.otaStatus === "idle" ? ["OTA status idle"] : [],
    safeNextStep:
      "Document OTA DID + DTCs. Soft reset may be tried if allow-listed; completion often needs OEM/backend [LIKELY].",
    localCorrectionPossible: false,
    oemAuthorizationLikely: true,
  }
}

function evalGatewayNetwork(state: VehicleState): CauseHypothesis {
  const offline = state.ecus.filter((e) => e.communicationFailure)
  const supporting: string[] = []
  let score = 0
  if (!state.gatewayHealthy) {
    score += 40
    supporting.push("Gateway health flag not OK")
  }
  if (offline.length) {
    score += Math.min(40, offline.length * 20)
    supporting.push(`Offline ECUs: ${offline.map((e) => e.name).join(", ")}`)
  }
  return {
    category: "gateway_network_fault",
    confidence: score >= 50 ? "likely" : score > 0 ? "inferred" : "unknown",
    score,
    summary: "Gateway or vehicle network communication fault",
    supportingEvidence: supporting,
    contradictingEvidence: state.gatewayHealthy && offline.length === 0 ? ["All ECUs online; gateway healthy"] : [],
    safeNextStep: "Passive network capture + power integrity check; avoid CommunicationControl silencing",
    localCorrectionPossible: true,
    oemAuthorizationLikely: false,
  }
}

function evalActiveDiagnosticSession(state: VehicleState): CauseHypothesis {
  const extended = state.ecus.filter((e) => e.session === "extended")
  let score = 0
  const supporting: string[] = []
  if (state.serviceMode === "active_diagnostic_session") {
    score += 60
    supporting.push("Service mode taxonomy classified active diagnostic session")
  }
  if (extended.length) {
    score += 30
    supporting.push(`Extended session active on: ${extended.map((e) => e.name).join(", ")}`)
  }
  return {
    category: "diagnostic_session_left_active",
    confidence: score >= 50 ? "likely" : score > 0 ? "inferred" : "unknown",
    score,
    summary: "Diagnostic session left active after prior tooling",
    supportingEvidence: supporting,
    contradictingEvidence: [],
    safeNextStep: "Request DiagnosticSessionControl to default session on affected ECUs (operator approval required)",
    localCorrectionPossible: true,
    oemAuthorizationLikely: false,
  }
}

function evalTransportConfig(state: VehicleState): CauseHypothesis {
  let score = 0
  const supporting: string[] = []
  if (state.serviceMode === "service_transport") {
    score += 70
    supporting.push("Service transport flag set (distinct from owner Flatbed Transport) [LIKELY]")
  }
  if (state.serviceMode === "flatbed_transport") {
    score += 50
    supporting.push("Flatbed transport indication — owner UI path may clear it [CONFIRMED for Flatbed Transport Mode]")
  }
  if (state.hvState === "shipping") {
    score += 15
    supporting.push("HV state reports shipping")
  }
  return {
    category: "transport_configuration",
    confidence: score >= 60 ? "likely" : score > 0 ? "inferred" : "unknown",
    score,
    summary: "Transport / shipping configuration active",
    supportingEvidence: supporting,
    contradictingEvidence: [],
    safeNextStep:
      state.serviceMode === "flatbed_transport"
        ? "Use Pilot Panel Settings → Vehicle to disable Flatbed Transport Mode per owner docs"
        : "Service Transport Mode likely needs Lucid service remote/local authorization [LIKELY]",
    localCorrectionPossible: state.serviceMode === "flatbed_transport",
    oemAuthorizationLikely: state.serviceMode === "service_transport",
  }
}

function evalHvFault(state: VehicleState): CauseHypothesis {
  let score = 0
  const supporting: string[] = []
  if (state.hvState === "fault") {
    score += 70
    supporting.push("HV state = fault")
  }
  const hvDtcs = state.ecus.flatMap((e) => e.dtcs.filter((d) => d.ecu === "BMS" || d.safetyCritical))
  if (hvDtcs.some((d) => d.description.toLowerCase().includes("hv") || d.ecu === "BMS")) {
    score += 20
    supporting.push("BMS/safety DTCs present")
  }
  return {
    category: "hv_system_fault",
    confidence: score >= 60 ? "likely" : score > 0 ? "inferred" : "unknown",
    score,
    summary: "High-voltage system fault contributing to restricted operation",
    supportingEvidence: supporting,
    contradictingEvidence: state.hvState === "ready" ? ["HV state ready"] : [],
    safeNextStep: "Do not clear safety DTCs. Escalate HV diagnosis to qualified EV technician / Lucid.",
    localCorrectionPossible: false,
    oemAuthorizationLikely: true,
  }
}

function evalEcuFault(state: VehicleState): CauseHypothesis {
  const active = state.ecus.flatMap((e) => e.dtcs.filter((d) => d.status === "active"))
  let score = active.length ? Math.min(50, active.length * 15) : 0
  return {
    category: "ecu_fault",
    confidence: score >= 30 ? "inferred" : "unknown",
    score,
    summary: "Active ECU fault DTCs present",
    supportingEvidence: active.slice(0, 5).map((d) => `${d.ecu}: ${d.code} ${d.description}`),
    contradictingEvidence: active.length ? [] : ["No active DTCs"],
    safeNextStep: "Correlate DTCs with mode flags; clear only non-safety DTCs after approval if conditions correct",
    localCorrectionPossible: active.some((d) => !d.safetyCritical),
    oemAuthorizationLikely: active.some((d) => d.safetyCritical),
  }
}

function evalMaintenanceLock(state: VehicleState): CauseHypothesis {
  let score = state.serviceMode === "maintenance_lock" ? 65 : 0
  return {
    category: "maintenance_lock",
    confidence: score ? "inferred" : "unknown",
    score,
    summary: "Maintenance lock flag active",
    supportingEvidence: score ? ["SERVICE_MODE_STATE bit indicates maintenance lock"] : [],
    contradictingEvidence: [],
    safeNextStep: "Identify unfinished service procedure; OEM tools may be required to complete",
    localCorrectionPossible: false,
    oemAuthorizationLikely: true,
  }
}
