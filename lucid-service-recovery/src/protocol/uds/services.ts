import type { DiagnosticSession } from "../../shared/types"

export const UdsSid = {
  DiagnosticSessionControl: 0x10,
  EcuReset: 0x11,
  SecurityAccess: 0x27,
  CommunicationControl: 0x28,
  TesterPresent: 0x3e,
  ReadDataByIdentifier: 0x22,
  ReadDtcInformation: 0x19,
  ClearDiagnosticInformation: 0x14,
  RoutineControl: 0x31,
} as const

export const SessionId: Record<DiagnosticSession, number> = {
  default: 0x01,
  programming: 0x02,
  extended: 0x03,
  safetySystem: 0x04,
  unknown: 0x00,
}

export function sessionFromId(id: number): DiagnosticSession {
  if (id === 0x01) return "default"
  if (id === 0x02) return "programming"
  if (id === 0x03) return "extended"
  if (id === 0x04) return "safetySystem"
  return "unknown"
}

export function buildDiagnosticSessionControl(session: DiagnosticSession): Uint8Array {
  const id = SessionId[session]
  if (!id) throw new Error(`unsupported session ${session}`)
  return new Uint8Array([UdsSid.DiagnosticSessionControl, id])
}

export function buildTesterPresent(suppressResponse = false): Uint8Array {
  return new Uint8Array([UdsSid.TesterPresent, suppressResponse ? 0x80 : 0x00])
}

export function buildEcuReset(type: "hard" | "keyOffOn" | "soft" = "soft"): Uint8Array {
  const sub = type === "hard" ? 0x01 : type === "keyOffOn" ? 0x02 : 0x03
  return new Uint8Array([UdsSid.EcuReset, sub])
}

export function buildReadDataByIdentifier(did: number): Uint8Array {
  return new Uint8Array([UdsSid.ReadDataByIdentifier, (did >> 8) & 0xff, did & 0xff])
}

export function buildReadDtcByStatusMask(mask = 0xff): Uint8Array {
  return new Uint8Array([UdsSid.ReadDtcInformation, 0x02, mask])
}

export function buildClearDiagnosticInformation(group = 0xffffff): Uint8Array {
  return new Uint8Array([
    UdsSid.ClearDiagnosticInformation,
    (group >> 16) & 0xff,
    (group >> 8) & 0xff,
    group & 0xff,
  ])
}

/**
 * SecurityAccess requestSeed only. Sending a key is intentionally unsupported.
 */
export function buildSecurityAccessRequestSeed(level: number): Uint8Array {
  if (level % 2 === 0) throw new Error("seed request level must be odd (0x01, 0x03, ...)")
  return new Uint8Array([UdsSid.SecurityAccess, level])
}

export function refuseSecurityAccessSendKey(): never {
  throw new Error(
    "OEM AUTHORIZATION REQUIRED — SecurityAccess sendKey is not implemented and must not be guessed, cracked, or derived",
  )
}
