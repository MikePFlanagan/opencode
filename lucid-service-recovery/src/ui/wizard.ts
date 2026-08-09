import { auditReset } from "../audit/command_audit"
import { analyzeRootCauses } from "../diagnostics/root_cause_engine"
import { scanVehicle } from "../diagnostics/scanner"
import { buildEscalationPackage, writeEscalationFiles } from "../reports/escalation"
import { executeSafeAction, listSafeActions, type SafeAction } from "../recovery/safe_actions"
import { createLogger } from "../shared/log"
import type { OperatingMode } from "../shared/types"
import { discoverInterfaces } from "../transport/discovery"
import { analyzeCanCapture } from "../transport/can/passive"
import { createSimulator } from "../simulator/vehicle_sim"
import type { ScenarioId } from "../simulator/scenarios"
import { summarizeState } from "../vehicle/lucid/state_model"
import { checkRecoveryPrerequisites } from "../recovery/prerequisite_checker"

const log = createLogger("ui.wizard")

export interface WizardOptions {
  scenario?: ScenarioId
  mode?: OperatingMode
  autoApprove?: boolean
  vin?: string
  year?: number
  variant?: string
  outDir?: string
  enableLiveWrite?: boolean
  simulatorSuitePassed?: boolean
}

export interface WizardResult {
  steps: string[]
  summary: string
  escalationPaths?: { json: string; md: string }
  oemAuthorizationRequired: boolean
}

export async function runRecoveryWizard(opts: WizardOptions = {}): Promise<WizardResult> {
  auditReset()
  const steps: string[] = []
  const mode: OperatingMode = opts.mode ?? "simulate"
  const scenario = opts.scenario ?? "service-mode-oem-auth"
  const outDir = opts.outDir ?? `${process.cwd()}/artifacts`
  const simulatorSuitePassed = opts.simulatorSuitePassed ?? true
  const liveWriteEnabled = Boolean(opts.enableLiveWrite)

  // STEP 1 — Connect
  steps.push("STEP 1 — Connect vehicle")
  const interfaces = await discoverInterfaces({ preferSimulator: mode === "simulate" })
  const selected = mode === "simulate" ? interfaces.find((i) => i.kind === "simulator") : interfaces.find((i) => i.available && i.kind !== "simulator")
  if (!selected) throw new Error("No diagnostic interface available")
  log.info("selected interface", { id: selected.id, kind: selected.kind })

  // STEP 2 — Verify safe physical state
  steps.push("STEP 2 — Verify safe physical state")
  console.log(`
SAFE PHYSICAL STATE CHECKLIST (operator confirmation required):
  [ ] Vehicle in Park, parking brake engaged, wheels chocked if needed
  [ ] No HV service work in progress / crash-damaged pack assessed by professional
  [ ] Operator authorized (vehicle owner / agent)
  [ ] Adequate 12V support available
`)

  // STEP 3 — Identify diagnostic interfaces
  steps.push("STEP 3 — Identify diagnostic interfaces")
  for (const iface of interfaces) {
    console.log(`  - ${iface.available ? "AVAILABLE" : "unavailable"} | ${iface.kind} | ${iface.label}`)
    console.log(`    ${iface.detail}`)
  }

  const transport = createSimulator(scenario)
  await transport.open()

  // STEP 4 — Scan modules
  steps.push("STEP 4 — Scan modules")
  let state = await scanVehicle({
    transport,
    scenarioHint: scenario,
    // Do not force extended sessions during discovery; read ACTIVE_SESSION DIDs instead.
    includeExtendedSessionProbe: false,
  })
  console.log("  " + summarizeState(state))

  // Passive CAN sample
  const frames = await transport.passiveCapture?.(200)
  if (frames) {
    const stats = analyzeCanCapture(frames)
    console.log(`  CAN passive sample: frames=${stats.frames} uniqueIds=${stats.uniqueIds} anomalies=${stats.anomalies.length}`)
  }

  // STEP 5 — Read DTCs and state
  steps.push("STEP 5 — Read DTCs and state")
  for (const ecu of state.ecus) {
    console.log(`  ${ecu.name}: online=${ecu.online} session=${ecu.session} dtcs=${ecu.dtcs.length}`)
    for (const dtc of ecu.dtcs) console.log(`    ${dtc.code} [${dtc.status}] ${dtc.description}`)
  }

  // STEP 6 — Root cause
  steps.push("STEP 6 — Determine Service Mode root cause")
  const hypotheses = analyzeRootCauses(state)
  for (const h of hypotheses.slice(0, 5)) {
    console.log(`  [${h.confidence}] ${h.category} score=${h.score}`)
    console.log(`    ${h.summary}`)
    console.log(`    local=${h.localCorrectionPossible} oemAuthLikely=${h.oemAuthorizationLikely}`)
    console.log(`    next: ${h.safeNextStep}`)
  }

  // STEP 7 — Prerequisites
  steps.push("STEP 7 — Check recovery prerequisites")
  const prereq = checkRecoveryPrerequisites({
    state,
    mode,
    actionId: "generic",
    simulatorSuitePassed,
    liveWriteEnabled,
  })
  for (const c of prereq.checks) console.log(`  ${c.ok ? "OK" : "FAIL"} ${c.name}: ${c.detail}`)

  // STEP 8 — Available actions
  steps.push("STEP 8 — Display available authorized recovery actions")
  const actions = listSafeActions(state).filter((a) => a.available)
  if (!actions.length) console.log("  No local safe recovery actions available.")
  for (const action of actions) {
    console.log(`  • ${action.id}: ${action.title} (risk=${action.risk})`)
    console.log(`    ${action.service}`)
    console.log(`    effect: ${action.effect}`)
  }

  // STEP 9 — Execute approved actions
  steps.push("STEP 9 — Execute operator-approved recovery")
  let oemAuthorizationRequired = hypotheses.some((h) => h.oemAuthorizationLikely && h.score >= 50)
  let authorizationText: string | undefined
  let failedOperation: { service: string; ecu: string; nrc?: number; detail: string } | undefined

  const selectedActions = selectActionsForScenario(actions, scenario)
  for (const action of selectedActions) {
    printActionGate(action)
    const result = await executeSafeAction({
      action,
      transport,
      state,
      mode: mode === "live-readonly" ? "live-readonly" : mode === "live-write" ? "live-write" : "simulate",
      simulatorSuitePassed,
      liveWriteEnabled: mode === "simulate" ? true : liveWriteEnabled,
      approve: async () => {
        if (opts.autoApprove) return true
        return promptYesNo(`Approve execution of ${action.id}?`)
      },
    })
    console.log(`  result: ${result.success ? "OK" : "FAIL"} — ${result.detail}`)
    if (result.authorizationRequired) {
      oemAuthorizationRequired = true
      authorizationText = result.authorizationText ?? result.detail
    }
    if (!result.success && result.nrc !== undefined) {
      failedOperation = {
        service: action.service,
        ecu: action.ecu,
        nrc: result.nrc,
        detail: result.detail,
      }
    }
  }

  // STEP 10 — Rescan
  steps.push("STEP 10 — Rescan vehicle")
  state = await scanVehicle({ transport, scenarioHint: scenario })
  console.log("  " + summarizeState(state))

  // STEP 11 — Verify
  steps.push("STEP 11 — Verify normal vehicle state")
  const postHypotheses = analyzeRootCauses(state)
  const normal = state.serviceMode === "none" && state.gatewayHealthy && state.hvState !== "fault"
  console.log(normal ? "  Vehicle appears in normal diagnostic state (simulator)." : "  Vehicle NOT restored to normal mode.")
  oemAuthorizationRequired =
    oemAuthorizationRequired || postHypotheses.some((h) => h.oemAuthorizationLikely && h.score >= 50)

  const pkg = buildEscalationPackage({
    state,
    hypotheses: postHypotheses,
    vin: opts.vin,
    year: opts.year,
    variant: opts.variant,
    failedOperation,
    authorization: authorizationText
      ? {
          required: true,
          message: "OEM AUTHORIZATION REQUIRED",
          reason: authorizationText,
          ecu: "CGW",
          service: "Service Mode clear / SecurityAccess",
          diagnosticState: "extended",
          availableIdentifiers: [],
        }
      : undefined,
  })

  await Bun.write(outDir + "/.keep", "")
  const escalationPaths = await writeEscalationFiles(pkg, outDir)
  await transport.close()

  return {
    steps,
    summary: summarizeState(state),
    escalationPaths,
    oemAuthorizationRequired: pkg.requiredOemAuthorization || oemAuthorizationRequired,
  }
}

function selectActionsForScenario(actions: SafeAction[], scenario: ScenarioId): SafeAction[] {
  if (scenario === "active-diagnostic-session") {
    return actions.filter((a) => a.id.startsWith("end-session-")).slice(0, 1)
  }
  if (scenario === "service-mode-oem-auth" || scenario === "interrupted-update" || scenario === "transport-mode") {
    return actions.filter((a) => a.id === "probe-oem-mode-clear")
  }
  if (scenario === "low-12v") return []
  return actions.filter((a) => a.id.startsWith("end-session-")).slice(0, 1)
}

function printActionGate(action: SafeAction) {
  console.log(`
════════════════════════════════════════
PROPOSED STATE-CHANGING COMMAND
  Action:  ${action.title}
  ECU:     ${action.ecu}
  Service: ${action.service}
  Effect:  ${action.effect}
  Risk:    ${action.risk}
  Payload: ${[...action.payload].map((b) => b.toString(16).padStart(2, "0")).join(" ")}
════════════════════════════════════════`)
}

async function promptYesNo(question: string): Promise<boolean> {
  const proc = Bun.stdin
  // Non-interactive environments: default deny for safety
  if (!process.stdin.isTTY) {
    console.log(`${question} [non-TTY → DENY]`)
    return false
  }
  process.stdout.write(`${question} [y/N] `)
  const reader = proc.stream().getReader()
  const { value } = await reader.read()
  reader.releaseLock()
  const text = new TextDecoder().decode(value ?? new Uint8Array()).trim().toLowerCase()
  return text === "y" || text === "yes"
}
