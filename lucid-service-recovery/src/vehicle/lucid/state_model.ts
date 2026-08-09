import type {
  DiagnosticSession,
  DidValue,
  DtcRecord,
  ServiceModeKind,
  VehicleIdentity,
} from "../../shared/types"

export interface EcuSnapshot {
  name: string
  logicalAddress: number
  online: boolean
  session: DiagnosticSession
  swVersion?: string
  hwVersion?: string
  dids: DidValue[]
  dtcs: DtcRecord[]
  communicationFailure: boolean
}

export interface VehicleState {
  identity: VehicleIdentity
  capturedAt: string
  transport: string
  serviceMode: ServiceModeKind
  serviceModeSources: string[]
  ignitionPower: "off" | "accessory" | "on" | "unknown"
  charging: "idle" | "ac" | "dc" | "unknown"
  lvBatteryMv?: number
  hvState: "unknown" | "locked_out" | "ready" | "fault" | "shipping"
  otaStatus: "idle" | "in_progress" | "failed_interrupted" | "unknown"
  gatewayHealthy: boolean
  ecus: EcuSnapshot[]
  notes: string[]
}

export function emptyVehicleState(partial?: Partial<VehicleState>): VehicleState {
  return {
    identity: { model: "Lucid Air" },
    capturedAt: new Date().toISOString(),
    transport: "none",
    serviceMode: "none",
    serviceModeSources: [],
    ignitionPower: "unknown",
    charging: "unknown",
    hvState: "unknown",
    otaStatus: "unknown",
    gatewayHealthy: false,
    ecus: [],
    notes: [],
    ...partial,
  }
}

export function decodeServiceModeFlags(raw: Uint8Array): ServiceModeKind {
  if (raw.length === 0) return "unknown_service_indication"
  const flags = raw[0]!
  if (flags & 0x08) return "crash_salvage_service"
  if (flags & 0x04) return "service_transport"
  if (flags & 0x02) return "flatbed_transport"
  if (flags & 0x01) return "maintenance_lock"
  if (flags & 0x10) return "active_diagnostic_session"
  return "none"
}

export function summarizeState(state: VehicleState): string {
  const online = state.ecus.filter((e) => e.online).length
  const dtcCount = state.ecus.reduce((n, e) => n + e.dtcs.length, 0)
  return [
    `model=${state.identity.model}`,
    `serviceMode=${state.serviceMode}`,
    `ecusOnline=${online}/${state.ecus.length}`,
    `dtcs=${dtcCount}`,
    `lvMv=${state.lvBatteryMv ?? "?"}`,
    `hv=${state.hvState}`,
    `ota=${state.otaStatus}`,
    `gateway=${state.gatewayHealthy ? "ok" : "fault"}`,
  ].join(" ")
}
