import { auditList } from "../audit/command_audit"
import type { CauseHypothesis } from "../diagnostics/root_cause_engine"
import type { AuthorizationBoundary, VehicleIdentity } from "../shared/types"
import type { VehicleState } from "../vehicle/lucid/state_model"
import { summarizeState } from "../vehicle/lucid/state_model"

export interface EscalationPackage {
  generatedAt: string
  identity: VehicleIdentity
  summary: string
  serviceMode: string
  hypotheses: CauseHypothesis[]
  vehicleState: VehicleState
  attemptedSafeActions: ReturnType<typeof auditList>
  failedOperation?: {
    service: string
    ecu: string
    nrc?: number
    detail: string
  }
  authorization?: AuthorizationBoundary
  requiredOemAuthorization: boolean
}

export function buildEscalationPackage(input: {
  state: VehicleState
  hypotheses: CauseHypothesis[]
  vin?: string
  year?: number
  variant?: string
  failedOperation?: EscalationPackage["failedOperation"]
  authorization?: AuthorizationBoundary
}): EscalationPackage {
  const identity: VehicleIdentity = {
    ...input.state.identity,
    vin: input.vin,
    year: input.year,
    variant: input.variant,
  }

  return {
    generatedAt: new Date().toISOString(),
    identity,
    summary: summarizeState(input.state),
    serviceMode: input.state.serviceMode,
    hypotheses: input.hypotheses,
    vehicleState: input.state,
    attemptedSafeActions: auditList(),
    failedOperation: input.failedOperation,
    authorization: input.authorization,
    requiredOemAuthorization:
      Boolean(input.authorization) ||
      input.hypotheses.some((h) => h.oemAuthorizationLikely && h.score >= 50),
  }
}

export function toJsonBundle(pkg: EscalationPackage): string {
  return JSON.stringify(
    pkg,
    (_key, value) => {
      if (value instanceof Uint8Array) {
        return [...value]
      }
      return value
    },
    2,
  )
}

export function toHumanReport(pkg: EscalationPackage): string {
  const lines: string[] = []
  lines.push("# Lucid Air Service Mode Escalation Package")
  lines.push("")
  lines.push(`Generated: ${pkg.generatedAt}`)
  lines.push(`Model: ${pkg.identity.model}${pkg.identity.year ? ` ${pkg.identity.year}` : ""}`)
  if (pkg.identity.variant) lines.push(`Variant: ${pkg.identity.variant}`)
  if (pkg.identity.vin) lines.push(`VIN: ${pkg.identity.vin}`)
  else lines.push("VIN: (not provided by operator)")
  lines.push("")
  lines.push("## Summary")
  lines.push(pkg.summary)
  lines.push(`Service Mode: ${pkg.serviceMode}`)
  lines.push(`OEM authorization required: ${pkg.requiredOemAuthorization ? "YES" : "NO"}`)
  lines.push("")
  lines.push("## Root Cause Hypotheses")
  for (const h of pkg.hypotheses.slice(0, 8)) {
    lines.push(`### ${h.category} (score=${h.score}, confidence=${h.confidence})`)
    lines.push(h.summary)
    lines.push(`Local correction possible: ${h.localCorrectionPossible}`)
    lines.push("Supporting:")
    for (const e of h.supportingEvidence) lines.push(`- ${e}`)
    if (h.contradictingEvidence.length) {
      lines.push("Contradicting:")
      for (const e of h.contradictingEvidence) lines.push(`- ${e}`)
    }
    lines.push(`Next: ${h.safeNextStep}`)
    lines.push("")
  }

  lines.push("## ECU Inventory")
  for (const ecu of pkg.vehicleState.ecus) {
    lines.push(
      `- ${ecu.name} @ 0x${ecu.logicalAddress.toString(16)} online=${ecu.online} session=${ecu.session} sw=${ecu.swVersion ?? "?"} hw=${ecu.hwVersion ?? "?"}`,
    )
  }
  lines.push("")
  lines.push("## DTCs")
  for (const ecu of pkg.vehicleState.ecus) {
    for (const dtc of ecu.dtcs) {
      lines.push(`- ${ecu.name}: ${dtc.code} [${dtc.status}] ${dtc.description}${dtc.safetyCritical ? " (SAFETY)" : ""}`)
    }
  }
  lines.push("")
  lines.push("## Relevant DIDs")
  for (const ecu of pkg.vehicleState.ecus) {
    for (const did of ecu.dids) {
      lines.push(`- ${ecu.name}: ${did.name} (0x${did.did.toString(16)}) = ${did.decoded} [${did.confidence}]`)
    }
  }
  lines.push("")
  lines.push("## Attempted Safe Recovery Operations")
  for (const a of pkg.attemptedSafeActions) {
    lines.push(`- ${a.ts} ${a.phase} ${a.ecu} ${a.service} → ${a.result ?? ""}`)
  }
  if (pkg.failedOperation) {
    lines.push("")
    lines.push("## Exact Failed Operation")
    lines.push(`ECU: ${pkg.failedOperation.ecu}`)
    lines.push(`Service: ${pkg.failedOperation.service}`)
    if (pkg.failedOperation.nrc !== undefined) lines.push(`NRC: 0x${pkg.failedOperation.nrc.toString(16)}`)
    lines.push(pkg.failedOperation.detail)
  }
  if (pkg.authorization) {
    lines.push("")
    lines.push("## Authorization Boundary")
    lines.push(pkg.authorization.message)
    lines.push(`ECU: ${pkg.authorization.ecu}`)
    lines.push(`Service: ${pkg.authorization.service}`)
    lines.push(`Security level: ${pkg.authorization.securityLevel ?? "n/a"}`)
    lines.push(`State: ${pkg.authorization.diagnosticState}`)
    lines.push(`Reason: ${pkg.authorization.reason}`)
  }
  lines.push("")
  lines.push("## Request to Lucid Service / Engineering")
  lines.push(
    "Please provide the authorized procedure (or remote session) to clear the documented Service Mode state. This package contains read-only diagnostics and only allow-listed safe recovery attempts. No SecurityAccess keys were calculated or sent.",
  )
  return lines.join("\n")
}

export async function writeEscalationFiles(pkg: EscalationPackage, dir: string) {
  await Bun.write(`${dir}/escalation.json`, toJsonBundle(pkg))
  await Bun.write(`${dir}/escalation.md`, toHumanReport(pkg))
  return {
    json: `${dir}/escalation.json`,
    md: `${dir}/escalation.md`,
  }
}
