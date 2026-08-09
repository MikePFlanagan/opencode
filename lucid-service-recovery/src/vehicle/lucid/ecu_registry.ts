import type { EcuAddress } from "../../shared/types"

/**
 * Logical addresses are SIMULATED placeholders, not OEM-confirmed maps.
 * Tag: UNKNOWN for production vehicles — discovery must override these.
 */
export const SIMULATED_ECUS: EcuAddress[] = [
  { logicalAddress: 0x0e80, name: "CGW", role: "Central Gateway / DoIP entity" },
  { logicalAddress: 0x0e81, name: "VCU", role: "Vehicle Control Unit" },
  { logicalAddress: 0x0e82, name: "BMS", role: "Battery Management System" },
  { logicalAddress: 0x0e83, name: "ZONE_FL", role: "Zone controller front-left" },
  { logicalAddress: 0x0e84, name: "ADAS", role: "Driver assistance domain" },
  { logicalAddress: 0x0e85, name: "IC", role: "Instrument / Pilot Panel host" },
]

export const STANDARD_DIDS = {
  VIN: 0xf190,
  ECU_SERIAL: 0xf18c,
  SW_VERSION: 0xf189,
  HW_VERSION: 0xf191,
  ACTIVE_SESSION: 0xf186,
  /** Simulated vendor DID — NOT an OEM-confirmed Lucid identifier */
  VEHICLE_MODE_FLAGS: 0x0100,
  LV_BATTERY_MV: 0x0101,
  HV_STATE: 0x0102,
  OTA_STATUS: 0x0103,
  SERVICE_MODE_STATE: 0x0104,
  GATEWAY_HEALTH: 0x0105,
  RESET_HISTORY: 0x0106,
} as const

export function ecuByName(name: string): EcuAddress {
  const ecu = SIMULATED_ECUS.find((e) => e.name === name)
  if (!ecu) throw new Error(`unknown ECU ${name}`)
  return ecu
}
