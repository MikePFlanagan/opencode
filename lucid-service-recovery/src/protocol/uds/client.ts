import { createLogger } from "../../shared/log"
import { toHex } from "../../shared/hex"
import type { UdsTransport } from "../../transport/types"
import type { AuthorizationBoundary, DiagnosticSession } from "../../shared/types"
import { nrcName } from "./nrc"
import {
  buildDiagnosticSessionControl,
  buildEcuReset,
  buildReadDataByIdentifier,
  buildReadDtcByStatusMask,
  buildSecurityAccessRequestSeed,
  buildTesterPresent,
  refuseSecurityAccessSendKey,
  sessionFromId,
  UdsSid,
} from "./services"

const log = createLogger("protocol.uds")

export class UdsNegativeResponseError extends Error {
  constructor(
    readonly sid: number,
    readonly nrc: number,
  ) {
    super(`UDS NRC 0x${nrc.toString(16)} (${nrcName(nrc)}) for SID 0x${sid.toString(16)}`)
  }
}

export interface UdsPositiveResponse {
  sid: number
  data: Uint8Array
  raw: Uint8Array
}

export class UdsClient {
  private session: DiagnosticSession = "default"

  constructor(
    private transport: UdsTransport,
    private logicalAddress: number,
    private ecuName: string,
  ) {}

  get currentSession() {
    return this.session
  }

  async rawRequest(payload: Uint8Array): Promise<UdsPositiveResponse> {
    log.debug("uds request", {
      ecu: this.ecuName,
      addr: this.logicalAddress,
      payload: toHex(payload),
    })
    const raw = await this.transport.request(this.logicalAddress, payload)
    if (raw.length >= 3 && raw[0] === 0x7f) {
      throw new UdsNegativeResponseError(raw[1]!, raw[2]!)
    }
    if (raw.length < 1 || raw[0]! !== (payload[0]! | 0x40)) {
      throw new Error(`unexpected UDS response: ${toHex(raw)}`)
    }
    return { sid: raw[0]!, data: raw.slice(1), raw }
  }

  async diagnosticSessionControl(session: DiagnosticSession) {
    const res = await this.rawRequest(buildDiagnosticSessionControl(session))
    this.session = sessionFromId(res.data[0] ?? SessionFallback(session))
    return this.session
  }

  async testerPresent() {
    return this.rawRequest(buildTesterPresent(false))
  }

  async readDataByIdentifier(did: number) {
    const res = await this.rawRequest(buildReadDataByIdentifier(did))
    // response: DID echo + data
    return res.data.slice(2)
  }

  async readDtcs(statusMask = 0xff) {
    const res = await this.rawRequest(buildReadDtcByStatusMask(statusMask))
    return parseDtcResponse(res.data)
  }

  async ecuReset(type: "hard" | "keyOffOn" | "soft" = "soft") {
    return this.rawRequest(buildEcuReset(type))
  }

  /**
   * Only requests a seed. Never computes or sends a key.
   */
  async securityAccessProbe(level: number): Promise<AuthorizationBoundary> {
    try {
      const res = await this.rawRequest(buildSecurityAccessRequestSeed(level))
      const seed = res.data.slice(1)
      log.warn("SecurityAccess seed received — stopping at authorization boundary", {
        ecu: this.ecuName,
        level,
        seedLen: seed.length,
      })
      return {
        required: true,
        message: "OEM AUTHORIZATION REQUIRED",
        reason: "ECU returned a SecurityAccess seed; key derivation/send is forbidden in this utility",
        ecu: this.ecuName,
        service: `SecurityAccess(0x27) level=0x${level.toString(16)}`,
        securityLevel: level,
        diagnosticState: this.session,
        availableIdentifiers: [`seed:${toHex(seed, "")}`],
      }
    } catch (error) {
      if (error instanceof UdsNegativeResponseError && error.nrc === 0x33) {
        return {
          required: true,
          message: "OEM AUTHORIZATION REQUIRED",
          reason: "securityAccessDenied (NRC 0x33)",
          ecu: this.ecuName,
          service: `SecurityAccess(0x27) level=0x${level.toString(16)}`,
          securityLevel: level,
          diagnosticState: this.session,
          availableIdentifiers: [],
        }
      }
      throw error
    }
  }

  sendSecurityKey(_level: number, _key: Uint8Array): never {
    return refuseSecurityAccessSendKey()
  }
}

function SessionFallback(session: DiagnosticSession): number {
  if (session === "default") return 0x01
  if (session === "programming") return 0x02
  if (session === "extended") return 0x03
  if (session === "safetySystem") return 0x04
  return 0x01
}

export function parseDtcResponse(data: Uint8Array): Array<{ code: string; status: number }> {
  // subfunction echo + availability mask + DTC records (3 bytes + status)
  if (data.length < 2) return []
  const records = data.slice(2)
  const out: Array<{ code: string; status: number }> = []
  for (let i = 0; i + 3 < records.length; i += 4) {
    const b0 = records[i]!
    const b1 = records[i + 1]!
    const b2 = records[i + 2]!
    const status = records[i + 3]!
    const code = formatUdsDtc(b0, b1, b2)
    out.push({ code, status })
  }
  return out
}

export function formatUdsDtc(b0: number, b1: number, b2: number): string {
  const prefixes = ["P", "C", "B", "U"]
  const prefix = prefixes[(b0 >> 6) & 0x03] ?? "U"
  const firstDigit = (b0 >> 4) & 0x03
  const second = b0 & 0x0f
  return `${prefix}${firstDigit}${second.toString(16).toUpperCase()}${b1.toString(16).padStart(2, "0").toUpperCase()}${b2.toString(16).padStart(2, "0").toUpperCase()}`
}

export { UdsSid }
