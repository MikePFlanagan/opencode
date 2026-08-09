#!/usr/bin/env bun
import { listScenarios, type ScenarioId } from "./simulator/scenarios"
import { runRecoveryWizard } from "./ui/wizard"
import { createSimulator } from "./simulator/vehicle_sim"
import { scanVehicle } from "./diagnostics/scanner"
import { analyzeRootCauses } from "./diagnostics/root_cause_engine"
import { buildEscalationPackage, writeEscalationFiles, toHumanReport } from "./reports/escalation"
import { discoverInterfaces } from "./transport/discovery"
import { refuseSecurityAccessSendKey } from "./protocol/uds/services"

function usage() {
  console.log(`Lucid Air Service Mode Recovery & Diagnostic Utility

Usage:
  bun run src/cli.ts wizard [--scenario <id>] [--mode simulate|live-readonly|live-write] [--auto-approve] [--vin ...]
  bun run src/cli.ts simulate --scenario <id>
  bun run src/cli.ts scan --scenario <id>
  bun run src/cli.ts escalate --scenario <id> [--vin ...]
  bun run src/cli.ts interfaces
  bun run src/cli.ts scenarios

Safety:
  Default is simulator / read-only.
  SecurityAccess key send is permanently disabled.
  Live writes require --mode live-write --enable-live-write after simulator tests pass.
`)
}

async function main() {
  const args = process.argv.slice(2)
  const cmd = args[0] ?? "wizard"

  if (cmd === "help" || cmd === "-h" || cmd === "--help") {
    usage()
    return
  }

  if (cmd === "scenarios") {
    for (const s of listScenarios()) console.log(`${s.id.padEnd(28)} ${s.title}`)
    return
  }

  if (cmd === "interfaces") {
    const list = await discoverInterfaces()
    for (const i of list) {
      console.log(`${i.available ? "[*]" : "[ ]"} ${i.id} ${i.kind} — ${i.label}`)
      console.log(`    ${i.detail}`)
    }
    return
  }

  if (cmd === "simulate" || cmd === "scan") {
    const scenario = getFlag(args, "--scenario") as ScenarioId | undefined
    const id = scenario ?? "service-mode-oem-auth"
    const transport = createSimulator(id)
    await transport.open()
    const state = await scanVehicle({ transport, scenarioHint: id, includeExtendedSessionProbe: id === "active-diagnostic-session" })
    const hypotheses = analyzeRootCauses(state)
    console.log(JSON.stringify({ state, hypotheses }, (_k, v) => (v instanceof Uint8Array ? [...v] : v), 2))
    await transport.close()
    return
  }

  if (cmd === "escalate") {
    const scenario = (getFlag(args, "--scenario") as ScenarioId | undefined) ?? "service-mode-oem-auth"
    const vin = getFlag(args, "--vin")
    const transport = createSimulator(scenario)
    await transport.open()
    const state = await scanVehicle({ transport, scenarioHint: scenario })
    const hypotheses = analyzeRootCauses(state)
    const pkg = buildEscalationPackage({
      state,
      hypotheses,
      vin,
      failedOperation: {
        ecu: "CGW",
        service: "RoutineControl ServiceModeClear (simulated 0xF100)",
        nrc: 0x33,
        detail: "OEM AUTHORIZATION REQUIRED — securityAccessDenied",
      },
    })
    const outDir = getFlag(args, "--out") ?? `${import.meta.dir}/../artifacts`
    const paths = await writeEscalationFiles(pkg, outDir)
    console.log(toHumanReport(pkg))
    console.log(`\nWrote ${paths.md}\nWrote ${paths.json}`)
    await transport.close()
    return
  }

  if (cmd === "wizard") {
    const scenario = (getFlag(args, "--scenario") as ScenarioId | undefined) ?? "service-mode-oem-auth"
    const mode = (getFlag(args, "--mode") as "simulate" | "live-readonly" | "live-write" | undefined) ?? "simulate"
    const result = await runRecoveryWizard({
      scenario,
      mode,
      autoApprove: args.includes("--auto-approve"),
      vin: getFlag(args, "--vin"),
      year: numberFlag(args, "--year"),
      variant: getFlag(args, "--variant"),
      outDir: getFlag(args, "--out") ?? `${import.meta.dir}/../artifacts`,
      enableLiveWrite: args.includes("--enable-live-write"),
      simulatorSuitePassed: !args.includes("--fail-sim-gate"),
    })
    console.log("\nWizard complete.")
    console.log(`Summary: ${result.summary}`)
    console.log(`OEM authorization required: ${result.oemAuthorizationRequired}`)
    if (result.escalationPaths) {
      console.log(`Escalation MD:  ${result.escalationPaths.md}`)
      console.log(`Escalation JSON: ${result.escalationPaths.json}`)
    }
    return
  }

  if (cmd === "security-self-check") {
    try {
      refuseSecurityAccessSendKey()
    } catch (error) {
      console.log(error instanceof Error ? error.message : error)
    }
    return
  }

  usage()
  process.exitCode = 1
}

function getFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name)
  if (idx === -1) return undefined
  return args[idx + 1]
}

function numberFlag(args: string[], name: string): number | undefined {
  const v = getFlag(args, name)
  return v ? Number(v) : undefined
}

await main()
