import { toHex } from "../shared/hex"
import type { RiskLevel } from "../shared/types"

export interface AuditEntry {
  id: string
  ts: string
  phase: "proposed" | "approved" | "denied" | "executed" | "failed" | "skipped"
  mode: string
  ecu: string
  service: string
  payloadHex: string
  effect: string
  risk: RiskLevel
  prerequisitesOk: boolean
  operatorApproval?: boolean
  result?: string
  nrc?: number
}

const entries: AuditEntry[] = []
let seq = 0

export function auditReset() {
  entries.length = 0
  seq = 0
}

export function auditList(): AuditEntry[] {
  return [...entries]
}

export function auditAppend(partial: Omit<AuditEntry, "id" | "ts"> & { ts?: string }): AuditEntry {
  seq += 1
  const entry: AuditEntry = {
    id: `AUD-${String(seq).padStart(4, "0")}`,
    ts: partial.ts ?? new Date().toISOString(),
    ...partial,
  }
  entries.push(entry)
  return entry
}

export function auditPropose(input: {
  mode: string
  ecu: string
  service: string
  payload: Uint8Array
  effect: string
  risk: RiskLevel
  prerequisitesOk: boolean
}) {
  return auditAppend({
    phase: "proposed",
    mode: input.mode,
    ecu: input.ecu,
    service: input.service,
    payloadHex: toHex(input.payload),
    effect: input.effect,
    risk: input.risk,
    prerequisitesOk: input.prerequisitesOk,
  })
}
