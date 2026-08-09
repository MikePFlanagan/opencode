import type { VehicleState } from "../vehicle/lucid/state_model"
import type { OperatingMode } from "../shared/types"

export interface PrerequisiteResult {
  ok: boolean
  checks: Array<{ name: string; ok: boolean; detail: string }>
}

export function checkRecoveryPrerequisites(input: {
  state: VehicleState
  mode: OperatingMode
  actionId: string
  simulatorSuitePassed: boolean
  liveWriteEnabled: boolean
}): PrerequisiteResult {
  const checks = [
    {
      name: "safe physical posture",
      ok: input.state.ignitionPower !== "unknown",
      detail: "Operator must confirm Park + parking brake before live work",
    },
    {
      name: "lv power",
      ok: input.state.lvBatteryMv === undefined || input.state.lvBatteryMv >= 11500,
      detail:
        input.state.lvBatteryMv === undefined
          ? "LV unknown — measure before write actions"
          : `LV=${input.state.lvBatteryMv} mV`,
    },
    {
      name: "simulator suite gate",
      ok: input.mode !== "live-write" || input.simulatorSuitePassed,
      detail: "Live writes require passing simulator tests",
    },
    {
      name: "live write flag",
      ok: input.mode !== "live-write" || input.liveWriteEnabled,
      detail: "live-write mode requires --enable-live-write",
    },
    {
      name: "no safety DTC clear",
      ok: input.actionId !== "clear-safety-dtcs",
      detail: "Clearing safety-critical DTCs is forbidden",
    },
    {
      name: "hv not in uncontrolled fault for drive enable",
      ok: true,
      detail: "HV faults must not be masked; recovery does not enable drive",
    },
  ]

  return { ok: checks.every((c) => c.ok), checks }
}
