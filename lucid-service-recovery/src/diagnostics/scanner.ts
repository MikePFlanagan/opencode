import { UdsClient, UdsNegativeResponseError } from "../protocol/uds/client"
import { createLogger } from "../shared/log"
import type { UdsTransport } from "../transport/types"
import { SIMULATED_ECUS, STANDARD_DIDS } from "../vehicle/lucid/ecu_registry"
import {
  decodeServiceModeFlags,
  emptyVehicleState,
  type EcuSnapshot,
  type VehicleState,
} from "../vehicle/lucid/state_model"
import { enrichDtc } from "./dtc_parser"
import type { ScenarioId } from "../simulator/scenarios"
import type { DidValue } from "../shared/types"
import { sessionFromId } from "../protocol/uds/services"

const log = createLogger("diagnostics.scanner")

export interface ScanOptions {
  transport: UdsTransport
  scenarioHint?: ScenarioId
  includeExtendedSessionProbe?: boolean
}

export async function scanVehicle(opts: ScanOptions): Promise<VehicleState> {
  const state = emptyVehicleState({
    transport: opts.transport.capabilities.kind,
    notes: [
      "ECU logical addresses may be simulated placeholders [UNKNOWN for live Lucid maps].",
      "DID semantics for vendor IDs are simulated unless marked CONFIRMED.",
    ],
  })

  const ecus: EcuSnapshot[] = []
  for (const ecu of SIMULATED_ECUS) {
    const client = new UdsClient(opts.transport, ecu.logicalAddress, ecu.name)
    const snapshot: EcuSnapshot = {
      name: ecu.name,
      logicalAddress: ecu.logicalAddress,
      online: false,
      session: "unknown",
      dids: [],
      dtcs: [],
      communicationFailure: false,
    }

    try {
      await client.testerPresent()
      snapshot.online = true
      snapshot.session = "default"

      if (opts.includeExtendedSessionProbe) {
        try {
          snapshot.session = await client.diagnosticSessionControl("extended")
        } catch (error) {
          if (error instanceof UdsNegativeResponseError) {
            log.warn("extended session denied", { ecu: ecu.name, nrc: error.nrc })
          }
        }
      }

      // Read active session DID if available
      snapshot.dids.push(...(await safeReadDids(client, ecu.name)))
      const sessionDid = snapshot.dids.find((d) => d.did === STANDARD_DIDS.ACTIVE_SESSION)
      if (sessionDid) snapshot.session = sessionFromId(sessionDid.raw[0] ?? 0)

      const sw = snapshot.dids.find((d) => d.did === STANDARD_DIDS.SW_VERSION)
      const hw = snapshot.dids.find((d) => d.did === STANDARD_DIDS.HW_VERSION)
      snapshot.swVersion = sw?.decoded
      snapshot.hwVersion = hw?.decoded

      const dtcs = await client.readDtcs(0xff)
      snapshot.dtcs = dtcs.map((d) =>
        enrichDtc({ ecu: ecu.name, code: d.code, status: d.status, scenarioHint: opts.scenarioHint }),
      )
    } catch (error) {
      snapshot.communicationFailure = true
      snapshot.online = false
      log.warn("ECU scan failed", {
        ecu: ecu.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    ecus.push(snapshot)
  }

  state.ecus = ecus
  const cgw = ecus.find((e) => e.name === "CGW")
  state.gatewayHealthy = Boolean(cgw?.online) && readGatewayHealthy(cgw)

  const modeDid = cgw?.dids.find((d) => d.did === STANDARD_DIDS.SERVICE_MODE_STATE)
  if (modeDid) {
    state.serviceMode = decodeServiceModeFlags(modeDid.raw)
    state.serviceModeSources.push("CGW.SERVICE_MODE_STATE")
  }

  // Leftover extended session indication
  const extended = ecus.filter((e) => e.online && e.session === "extended")
  if (extended.length && state.serviceMode === "none") {
    state.serviceMode = "active_diagnostic_session"
    state.serviceModeSources.push(...extended.map((e) => `${e.name}.session=extended`))
  }

  const lv = cgw?.dids.find((d) => d.did === STANDARD_DIDS.LV_BATTERY_MV)
  if (lv && lv.raw.length >= 2) state.lvBatteryMv = (lv.raw[0]! << 8) | lv.raw[1]!

  const hv = cgw?.dids.find((d) => d.did === STANDARD_DIDS.HV_STATE) ?? ecus.find((e) => e.name === "BMS")?.dids.find((d) => d.did === STANDARD_DIDS.HV_STATE)
  if (hv) {
    state.hvState = hv.raw[0] === 0x01 ? "ready" : hv.raw[0] === 0x02 ? "fault" : hv.raw[0] === 0x03 ? "shipping" : "unknown"
  }

  const ota = cgw?.dids.find((d) => d.did === STANDARD_DIDS.OTA_STATUS)
  if (ota) {
    state.otaStatus = ota.raw[0] === 0x02 ? "failed_interrupted" : ota.raw[0] === 0x01 ? "in_progress" : ota.raw[0] === 0x00 ? "idle" : "unknown"
  }

  state.ignitionPower = "on"
  state.capturedAt = new Date().toISOString()
  return state
}

async function safeReadDids(client: UdsClient, ecuName: string): Promise<DidValue[]> {
  const targets: Array<{ did: number; name: string; ecus?: string[] }> = [
    { did: STANDARD_DIDS.SW_VERSION, name: "SW_VERSION" },
    { did: STANDARD_DIDS.HW_VERSION, name: "HW_VERSION" },
    { did: STANDARD_DIDS.ACTIVE_SESSION, name: "ACTIVE_SESSION" },
    { did: STANDARD_DIDS.SERVICE_MODE_STATE, name: "SERVICE_MODE_STATE", ecus: ["CGW"] },
    { did: STANDARD_DIDS.LV_BATTERY_MV, name: "LV_BATTERY_MV", ecus: ["CGW", "VCU"] },
    { did: STANDARD_DIDS.HV_STATE, name: "HV_STATE", ecus: ["CGW", "BMS"] },
    { did: STANDARD_DIDS.OTA_STATUS, name: "OTA_STATUS", ecus: ["CGW"] },
    { did: STANDARD_DIDS.GATEWAY_HEALTH, name: "GATEWAY_HEALTH", ecus: ["CGW"] },
    { did: STANDARD_DIDS.RESET_HISTORY, name: "RESET_HISTORY", ecus: ["CGW"] },
  ]

  const out: DidValue[] = []
  for (const target of targets) {
    if (target.ecus && !target.ecus.includes(ecuName)) continue
    try {
      const raw = await client.readDataByIdentifier(target.did)
      out.push({
        did: target.did,
        name: target.name,
        raw,
        decoded: decodeDid(target.did, raw),
        confidence: target.did >= 0xf180 ? "likely" : "inferred",
      })
    } catch {
      // DID unsupported on this ECU
    }
  }
  return out
}

function decodeDid(did: number, raw: Uint8Array): string {
  if (
    did === STANDARD_DIDS.SW_VERSION ||
    did === STANDARD_DIDS.HW_VERSION ||
    did === STANDARD_DIDS.VIN
  ) {
    return new TextDecoder().decode(raw)
  }
  if (did === STANDARD_DIDS.LV_BATTERY_MV && raw.length >= 2) {
    return `${(raw[0]! << 8) | raw[1]!} mV`
  }
  return [...raw].map((b) => b.toString(16).padStart(2, "0")).join(" ")
}

function readGatewayHealthy(cgw?: EcuSnapshot): boolean {
  const did = cgw?.dids.find((d) => d.did === STANDARD_DIDS.GATEWAY_HEALTH)
  if (!did) return Boolean(cgw?.online)
  return did.raw[0] === 0x01
}
