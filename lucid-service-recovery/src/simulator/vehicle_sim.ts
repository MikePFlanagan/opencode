import { toHex } from "../shared/hex"
import { createLogger } from "../shared/log"
import { UdsSid } from "../protocol/uds/services"
import { SIMULATED_ECUS, STANDARD_DIDS } from "../vehicle/lucid/ecu_registry"
import type { CanFrame, TransportCapabilities, UdsTransport } from "../transport/types"
import { SCENARIOS, type ScenarioDefinition, type ScenarioId } from "./scenarios"

const log = createLogger("simulator")

interface SimEcu {
  name: string
  logicalAddress: number
  online: boolean
  session: number
  securityUnlocked: boolean
  sw: string
  hw: string
}

export class SimulatorTransport implements UdsTransport {
  readonly capabilities: TransportCapabilities = {
    kind: "simulator",
    readOnly: false,
    supportsDiscovery: true,
    supportsUds: true,
    supportsPassiveCapture: true,
    maxPayload: 4095,
  }

  private scenario: ScenarioDefinition
  private ecus = new Map<number, SimEcu>()
  private opened = false
  private canLog: CanFrame[] = []

  constructor(scenarioId: ScenarioId = "service-mode-oem-auth") {
    this.scenario = cloneScenario(SCENARIOS[scenarioId])
    this.resetEcus()
  }

  get scenarioId() {
    return this.scenario.id
  }

  getScenario() {
    return this.scenario
  }

  setScenario(scenarioId: ScenarioId) {
    this.scenario = cloneScenario(SCENARIOS[scenarioId])
    this.resetEcus()
  }

  private resetEcus() {
    this.ecus.clear()
    for (const ecu of SIMULATED_ECUS) {
      this.ecus.set(ecu.logicalAddress, {
        name: ecu.name,
        logicalAddress: ecu.logicalAddress,
        online: !this.scenario.offlineEcus.includes(ecu.name),
        session: ecu.name === "VCU" && this.scenario.id === "active-diagnostic-session" ? 0x03 : 0x01,
        securityUnlocked: false,
        sw: `SIM-SW-1.0.${ecu.logicalAddress & 0xff}`,
        hw: `SIM-HW-${ecu.name}`,
      })
    }
    this.seedCanTraffic()
  }

  private seedCanTraffic() {
    const now = performance.now()
    this.canLog = [
      { tsMs: now, id: 0x100, ide: false, rtr: false, fdf: false, data: new Uint8Array([0x01, 0x00]), channel: "sim0" },
      { tsMs: now + 10, id: 0x200, ide: false, rtr: false, fdf: true, data: new Uint8Array([0xaa, 0xbb]), channel: "sim0" },
      { tsMs: now + 20, id: 0x300, ide: false, rtr: false, fdf: false, data: new Uint8Array([this.scenario.serviceModeByte]), channel: "sim0" },
    ]
    if (!this.scenario.gatewayHealthy) {
      this.canLog.push({
        tsMs: now + 25,
        id: 0x7fe,
        ide: false,
        rtr: false,
        fdf: false,
        data: new Uint8Array([0xff]),
        channel: "sim0",
      })
    }
  }

  async open(): Promise<void> {
    this.opened = true
    log.info("simulator opened", { scenario: this.scenario.id })
  }

  async close(): Promise<void> {
    this.opened = false
    log.info("simulator closed")
  }

  async passiveCapture(durationMs: number): Promise<CanFrame[]> {
    void durationMs
    return [...this.canLog]
  }

  async request(logicalAddress: number, payload: Uint8Array): Promise<Uint8Array> {
    if (!this.opened) throw new Error("simulator not open")
    const ecu = this.ecus.get(logicalAddress)
    if (!ecu || !ecu.online) {
      // timeout simulation
      throw new Error(`No response from 0x${logicalAddress.toString(16)}`)
    }
    const sid = payload[0]
    if (sid === undefined) return neg(0x00, 0x13)

    switch (sid) {
      case UdsSid.DiagnosticSessionControl:
        return this.onSession(ecu, payload)
      case UdsSid.TesterPresent:
        return new Uint8Array([0x7e, payload[1] ?? 0x00])
      case UdsSid.EcuReset:
        return this.onReset(ecu, payload)
      case UdsSid.ReadDataByIdentifier:
        return this.onReadDid(ecu, payload)
      case UdsSid.ReadDtcInformation:
        return this.onReadDtc(ecu, payload)
      case UdsSid.ClearDiagnosticInformation:
        return this.onClearDtc(ecu, payload)
      case UdsSid.SecurityAccess:
        return this.onSecurity(ecu, payload)
      case UdsSid.RoutineControl:
        return this.onRoutine(ecu, payload)
      case UdsSid.CommunicationControl:
        return neg(sid, 0x33)
      default:
        return neg(sid, 0x11)
    }
  }

  private onSession(ecu: SimEcu, payload: Uint8Array): Uint8Array {
    const sub = payload[1]
    if (sub !== 0x01 && sub !== 0x03) return neg(UdsSid.DiagnosticSessionControl, 0x12)
    ecu.session = sub
    ecu.securityUnlocked = false
    if (sub === 0x01) this.clearActiveDiagnosticFlagIfIdle()
    return new Uint8Array([0x50, sub, 0x00, 0x32, 0x01, 0xf4])
  }

  private clearActiveDiagnosticFlagIfIdle() {
    const anyExtended = [...this.ecus.values()].some((e) => e.online && e.session === 0x03)
    if (!anyExtended) this.scenario.serviceModeByte &= ~0x10
  }

  private onReset(ecu: SimEcu, payload: Uint8Array): Uint8Array {
    const sub = payload[1]
    if (sub !== 0x01 && sub !== 0x03) return neg(UdsSid.EcuReset, 0x12)
    if (ecu.name === "ADAS" || ecu.name === "BMS") return neg(UdsSid.EcuReset, 0x22)
    ecu.session = 0x01
    return new Uint8Array([0x51, sub])
  }

  private onReadDid(ecu: SimEcu, payload: Uint8Array): Uint8Array {
    if (payload.length < 3) return neg(UdsSid.ReadDataByIdentifier, 0x13)
    const did = (payload[1]! << 8) | payload[2]!
    const data = this.didData(ecu, did)
    if (!data) return neg(UdsSid.ReadDataByIdentifier, 0x31)
    return new Uint8Array([0x62, payload[1]!, payload[2]!, ...data])
  }

  private didData(ecu: SimEcu, did: number): Uint8Array | undefined {
    if (did === STANDARD_DIDS.VIN) return encodeAscii("SIMULATEDAIRVIN00000")
    if (did === STANDARD_DIDS.SW_VERSION) return encodeAscii(ecu.sw)
    if (did === STANDARD_DIDS.HW_VERSION) return encodeAscii(ecu.hw)
    if (did === STANDARD_DIDS.ACTIVE_SESSION) return new Uint8Array([ecu.session])
    if (did === STANDARD_DIDS.SERVICE_MODE_STATE && ecu.name === "CGW") {
      return new Uint8Array([this.scenario.serviceModeByte])
    }
    if (did === STANDARD_DIDS.VEHICLE_MODE_FLAGS && ecu.name === "CGW") {
      return new Uint8Array([this.scenario.serviceModeByte])
    }
    if (did === STANDARD_DIDS.LV_BATTERY_MV && (ecu.name === "CGW" || ecu.name === "VCU")) {
      const mv = this.scenario.lvBatteryMv
      return new Uint8Array([(mv >> 8) & 0xff, mv & 0xff])
    }
    if (did === STANDARD_DIDS.HV_STATE && (ecu.name === "BMS" || ecu.name === "CGW")) {
      return new Uint8Array([this.scenario.hvState])
    }
    if (did === STANDARD_DIDS.OTA_STATUS && ecu.name === "CGW") {
      return new Uint8Array([this.scenario.otaStatus])
    }
    if (did === STANDARD_DIDS.GATEWAY_HEALTH && ecu.name === "CGW") {
      return new Uint8Array([this.scenario.gatewayHealthy ? 0x01 : 0x00])
    }
    if (did === STANDARD_DIDS.RESET_HISTORY && ecu.name === "CGW") {
      return new Uint8Array([0x02, 0x01, 0x03])
    }
    return undefined
  }

  private onReadDtc(ecu: SimEcu, payload: Uint8Array): Uint8Array {
    if (payload[1] !== 0x02) return neg(UdsSid.ReadDtcInformation, 0x12)
    const list = this.scenario.dtcs[ecu.name] ?? []
    const body: number[] = [0x59, 0x02, 0xff]
    for (const dtc of list) {
      body.push(...dtc.bytes, dtc.status)
    }
    return new Uint8Array(body)
  }

  private onClearDtc(ecu: SimEcu, _payload: Uint8Array): Uint8Array {
    const list = this.scenario.dtcs[ecu.name] ?? []
    if (list.some((d) => d.safety)) return neg(UdsSid.ClearDiagnosticInformation, 0x22)
    this.scenario.dtcs[ecu.name] = []
    return new Uint8Array([0x54])
  }

  private onSecurity(ecu: SimEcu, payload: Uint8Array): Uint8Array {
    const level = payload[1]
    if (level === undefined) return neg(UdsSid.SecurityAccess, 0x13)
    // odd = requestSeed
    if (level % 2 === 1) {
      return new Uint8Array([0x67, level, 0xde, 0xad, 0xbe, 0xef])
    }
    // even = sendKey — always reject; tool should never send this
    log.warn("simulator received SecurityAccess sendKey — rejecting", {
      ecu: ecu.name,
      payload: toHex(payload),
    })
    return neg(UdsSid.SecurityAccess, 0x35)
  }

  private onRoutine(ecu: SimEcu, payload: Uint8Array): Uint8Array {
    // Simulated OEM mode-clear routine 0xF100
    if (payload.length < 4) return neg(UdsSid.RoutineControl, 0x13)
    const rid = (payload[2]! << 8) | payload[3]!
    if (rid === 0xf100 && ecu.name === "CGW") {
      if (this.scenario.forceSecurityForModeClear && !ecu.securityUnlocked) {
        return neg(UdsSid.RoutineControl, 0x33)
      }
      this.scenario.serviceModeByte = 0x00
      return new Uint8Array([0x71, payload[1]!, payload[2]!, payload[3]!, 0x00])
    }
    return neg(UdsSid.RoutineControl, 0x31)
  }
}

function neg(sid: number, nrc: number) {
  return new Uint8Array([0x7f, sid, nrc])
}

function encodeAscii(text: string) {
  return new Uint8Array([...text].map((c) => c.charCodeAt(0)))
}

export function createSimulator(scenario: ScenarioId = "service-mode-oem-auth") {
  return new SimulatorTransport(scenario)
}

function cloneScenario(scenario: ScenarioDefinition): ScenarioDefinition {
  return {
    ...scenario,
    offlineEcus: [...scenario.offlineEcus],
    dtcs: Object.fromEntries(
      Object.entries(scenario.dtcs).map(([ecu, list]) => [
        ecu,
        list.map((d) => ({ ...d, bytes: [...d.bytes] as [number, number, number] })),
      ]),
    ),
  }
}
