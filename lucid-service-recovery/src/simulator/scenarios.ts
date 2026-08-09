export type ScenarioId =
  | "healthy"
  | "service-mode-oem-auth"
  | "low-12v"
  | "failed-ecu"
  | "interrupted-update"
  | "active-diagnostic-session"
  | "transport-mode"
  | "hv-fault"

export interface ScenarioDefinition {
  id: ScenarioId
  title: string
  description: string
  serviceModeByte: number
  lvBatteryMv: number
  hvState: number
  otaStatus: number
  gatewayHealthy: boolean
  offlineEcus: string[]
  forceSecurityForModeClear: boolean
  dtcs: Record<string, Array<{ bytes: [number, number, number]; status: number; safety: boolean; desc: string }>>
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  healthy: {
    id: "healthy",
    title: "Healthy vehicle",
    description: "No Service Mode, all modules online",
    serviceModeByte: 0x00,
    lvBatteryMv: 12800,
    hvState: 0x01,
    otaStatus: 0x00,
    gatewayHealthy: true,
    offlineEcus: [],
    forceSecurityForModeClear: false,
    dtcs: {},
  },
  "service-mode-oem-auth": {
    id: "service-mode-oem-auth",
    title: "Crash/salvage Service Mode requiring OEM auth",
    description: "CGW reports Service Mode; mode clear routine denied without SecurityAccess",
    serviceModeByte: 0x08,
    lvBatteryMv: 12600,
    hvState: 0x01,
    otaStatus: 0x00,
    gatewayHealthy: true,
    offlineEcus: [],
    forceSecurityForModeClear: true,
    dtcs: {
      CGW: [{ bytes: [0xc0, 0x55, 0x01], status: 0x2f, safety: false, desc: "Service mode active (simulated)" }],
      ADAS: [{ bytes: [0xd0, 0x11, 0x01], status: 0x2f, safety: true, desc: "Restraint event history present (simulated)" }],
    },
  },
  "low-12v": {
    id: "low-12v",
    title: "Low 12V supply",
    description: "LV below healthy threshold; intermittent gateway health",
    serviceModeByte: 0x00,
    lvBatteryMv: 10950,
    hvState: 0x01,
    otaStatus: 0x00,
    gatewayHealthy: false,
    offlineEcus: ["ZONE_FL"],
    forceSecurityForModeClear: false,
    dtcs: {
      CGW: [{ bytes: [0xc1, 0x12, 0x00], status: 0x2f, safety: false, desc: "LV voltage low (simulated)" }],
    },
  },
  "failed-ecu": {
    id: "failed-ecu",
    title: "Failed ECU / network fault",
    description: "BMS offline; gateway reports communication failure",
    serviceModeByte: 0x00,
    lvBatteryMv: 12500,
    hvState: 0x02,
    otaStatus: 0x00,
    gatewayHealthy: true,
    offlineEcus: ["BMS"],
    forceSecurityForModeClear: false,
    dtcs: {
      CGW: [{ bytes: [0xc2, 0x01, 0x82], status: 0x2f, safety: false, desc: "Lost communication with BMS (simulated)" }],
      VCU: [{ bytes: [0xc2, 0x01, 0x82], status: 0x2e, safety: false, desc: "Lost communication with BMS (simulated)" }],
    },
  },
  "interrupted-update": {
    id: "interrupted-update",
    title: "Interrupted OTA / software update",
    description: "OTA status failed/interrupted; maintenance lock flag set",
    serviceModeByte: 0x01,
    lvBatteryMv: 12700,
    hvState: 0x01,
    otaStatus: 0x02,
    gatewayHealthy: true,
    offlineEcus: [],
    forceSecurityForModeClear: true,
    dtcs: {
      CGW: [{ bytes: [0xc3, 0x44, 0x01], status: 0x2f, safety: false, desc: "Software update incomplete (simulated)" }],
      IC: [{ bytes: [0xc3, 0x44, 0x02], status: 0x2e, safety: false, desc: "Infotainment update incomplete (simulated)" }],
    },
  },
  "active-diagnostic-session": {
    id: "active-diagnostic-session",
    title: "Leftover extended diagnostic session",
    description: "VCU left in extended session; no OEM lock",
    serviceModeByte: 0x10,
    lvBatteryMv: 12850,
    hvState: 0x01,
    otaStatus: 0x00,
    gatewayHealthy: true,
    offlineEcus: [],
    forceSecurityForModeClear: false,
    dtcs: {},
  },
  "transport-mode": {
    id: "transport-mode",
    title: "Service transport configuration",
    description: "Service transport flag set (distinct from owner Flatbed Transport)",
    serviceModeByte: 0x04,
    lvBatteryMv: 12900,
    hvState: 0x03,
    otaStatus: 0x00,
    gatewayHealthy: true,
    offlineEcus: [],
    forceSecurityForModeClear: true,
    dtcs: {
      VCU: [{ bytes: [0xc4, 0x01, 0x00], status: 0x2f, safety: false, desc: "Transport configuration active (simulated)" }],
    },
  },
  "hv-fault": {
    id: "hv-fault",
    title: "HV system fault",
    description: "BMS reports HV fault; vehicle may present reduced mode",
    serviceModeByte: 0x00,
    lvBatteryMv: 12650,
    hvState: 0x02,
    otaStatus: 0x00,
    gatewayHealthy: true,
    offlineEcus: [],
    forceSecurityForModeClear: false,
    dtcs: {
      BMS: [{ bytes: [0xa0, 0x77, 0x01], status: 0x2f, safety: true, desc: "HV isolation / pack fault (simulated)" }],
    },
  },
}

export function listScenarios(): ScenarioDefinition[] {
  return Object.values(SCENARIOS)
}
