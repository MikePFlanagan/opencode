export type Confidence = "confirmed" | "likely" | "inferred" | "unknown"
export type KnowledgeTag = "CONFIRMED" | "LIKELY" | "INFERRED" | "UNKNOWN"
export type RiskLevel = "none" | "low" | "medium" | "high" | "critical"
export type OperatingMode =
  | "simulate"
  | "live-readonly"
  | "live-write"

export type TransportKind = "doip" | "isotp-can" | "isotp-canfd" | "obd" | "simulator"

export type DiagnosticSession =
  | "default"
  | "programming"
  | "extended"
  | "safetySystem"
  | "unknown"

export type ServiceModeKind =
  | "none"
  | "flatbed_transport"
  | "service_transport"
  | "crash_salvage_service"
  | "active_diagnostic_session"
  | "maintenance_lock"
  | "unknown_service_indication"

export type CauseCategory =
  | "unfinished_service_procedure"
  | "ecu_fault"
  | "low_12v"
  | "hv_system_fault"
  | "interrupted_software_update"
  | "gateway_network_fault"
  | "maintenance_lock"
  | "transport_configuration"
  | "diagnostic_session_left_active"
  | "module_config_incomplete"
  | "oem_backend_authorization_required"
  | "unknown"

export type NegativeResponseCode =
  | 0x10
  | 0x11
  | 0x12
  | 0x13
  | 0x14
  | 0x22
  | 0x24
  | 0x31
  | 0x33
  | 0x35
  | 0x36
  | 0x37
  | 0x70
  | 0x72
  | 0x78
  | 0x7e
  | 0x7f
  | number

export interface EcuAddress {
  logicalAddress: number
  name: string
  role: string
}

export interface DtcRecord {
  code: string
  status: "active" | "stored" | "pending" | "unknown"
  description: string
  safetyCritical: boolean
  ecu: string
}

export interface DidValue {
  did: number
  name: string
  raw: Uint8Array
  decoded: string
  confidence: Confidence
}

export interface VehicleIdentity {
  vin?: string
  model: string
  year?: number
  variant?: string
}

export interface AuthorizationBoundary {
  required: true
  reason: string
  ecu: string
  service: string
  securityLevel?: number
  diagnosticState: string
  availableIdentifiers: string[]
  message: "OEM AUTHORIZATION REQUIRED"
}
