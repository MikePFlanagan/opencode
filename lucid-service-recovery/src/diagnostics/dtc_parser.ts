import type { DtcRecord } from "../shared/types"
import { SCENARIOS, type ScenarioId } from "../simulator/scenarios"

export function classifyDtcStatus(status: number): DtcRecord["status"] {
  const testFailed = Boolean(status & 0x01)
  const confirmed = Boolean(status & 0x08)
  const pending = Boolean(status & 0x04)
  if (testFailed || confirmed) return "active"
  if (pending) return "pending"
  if (status) return "stored"
  return "unknown"
}

export function enrichDtc(input: {
  ecu: string
  code: string
  status: number
  scenarioHint?: ScenarioId
}): DtcRecord {
  const fromScenario = input.scenarioHint
    ? SCENARIOS[input.scenarioHint].dtcs[input.ecu]?.find((d) => {
        const code = formatFromBytes(d.bytes)
        return code === input.code
      })
    : undefined

  return {
    code: input.code,
    status: classifyDtcStatus(input.status),
    description: fromScenario?.desc ?? `UDS DTC ${input.code} (description UNKNOWN — OEM catalog not public)`,
    safetyCritical: fromScenario?.safety ?? isLikelySafetyDtc(input.code),
    ecu: input.ecu,
  }
}

function formatFromBytes(bytes: [number, number, number]): string {
  const prefixes = ["P", "C", "B", "U"]
  const b0 = bytes[0]
  const prefix = prefixes[(b0 >> 6) & 0x03] ?? "U"
  const firstDigit = (b0 >> 4) & 0x03
  const second = b0 & 0x0f
  return `${prefix}${firstDigit}${second.toString(16).toUpperCase()}${bytes[1].toString(16).padStart(2, "0").toUpperCase()}${bytes[2].toString(16).padStart(2, "0").toUpperCase()}`
}

function isLikelySafetyDtc(code: string): boolean {
  return code.startsWith("B") || code.startsWith("C0")
}
