# Lucid Air Service Mode Recovery & Diagnostic Utility

Authorized, owner-operated diagnostic utility for determining why a Lucid Air is in Service Mode and performing **only** safe, allow-listed recovery steps. Default posture is **READ-ONLY**. Cryptographic SecurityAccess unlocking, credential cracking, firmware forgery, immobilizer bypass, and safety-system tampering are out of scope and unimplemented.

> This is **not** an OEM tool and does not impersonate Lucid backend infrastructure.

## 1. Architecture Assessment (Executive)

Lucid Air diagnostics appear to center on a **trunk Ethernet diagnostic port** using **DoIP + UDS**, not a classic OBD-II jack ([CONFIRMED] port existence / OBD absence from owner documentation & reports; [LIKELY] DoIP/UDS stack). “Service Mode” is **not** one global switch: owner-accessible Flatbed Transport Mode differs from service-set Transport Mode and from crash/salvage Service Mode that owners report requires Lucid authorization ([CONFIRMED] behavioral reports; [UNKNOWN] exact DID/routine map).

**Hard boundary:** if exiting Service Mode needs OEM-signed commands, dealer certificates, backend tokens, or SecurityAccess keys, the tool stops, labels **OEM AUTHORIZATION REQUIRED**, and generates an escalation package.

See:

- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/SAFETY_MODEL.md`
- `docs/LIVE_VEHICLE_CHECKLIST.md`
- `knowledge/lucid-air.md`

## 2. Information / Research Gaps

| Gap | Tag |
| --- | --- |
| Official DoIP logical address map | UNKNOWN |
| Official Service Mode DID / clear routine IDs | UNKNOWN |
| SecurityAccess algorithms / levels for mode clear | UNKNOWN |
| Exact PHY of trunk port (100BASE-TX vs 100BASE-T1) | UNKNOWN |
| Whether salvage lock is purely local vs backend-bound | INFERRED backend/service |

Simulated addresses/DIDs are clearly labeled and must be replaced by live discovery results.

## 3. Recommended Hardware Interface

1. **Primary:** Automotive Ethernet media converter + DoIP-capable host → Lucid trunk diagnostic port  
2. **Secondary:** USB-CAN-FD for passive edge-CAN capture only  
3. **Not primary:** ELM327/OBD-II dongles (no J1962 port on Air)

## 4. Repository Structure

```
lucid-service-recovery/
  docs/           architecture, safety, threat model, live checklist
  knowledge/      tagged Lucid facts
  src/transport/  doip, can, discovery HAL
  src/protocol/   UDS (read-first)
  src/vehicle/    Lucid registry + state model
  src/diagnostics scanner, DTC parser, root-cause engine
  src/recovery/   prerequisites, safe actions, auth boundary
  src/simulator/  multi-ECU scenarios
  src/reports/    escalation MD + JSON
  src/ui/         recovery wizard
  tests/          unit + integration
```

## 5. Quick Start (Simulator First)

Requires Bun:

```bash
cd lucid-service-recovery
bun test
bun run src/cli.ts scenarios
bun run src/cli.ts wizard --scenario service-mode-oem-auth --auto-approve
bun run src/cli.ts wizard --scenario active-diagnostic-session --auto-approve
bun run src/cli.ts escalate --scenario interrupted-update
```

### Scenarios

| ID | Purpose |
| --- | --- |
| `healthy` | Baseline |
| `service-mode-oem-auth` | Crash/salvage Service Mode → OEM boundary |
| `low-12v` | LV / gateway instability |
| `failed-ecu` | Module offline |
| `interrupted-update` | OTA failure + maintenance lock |
| `active-diagnostic-session` | Leftover extended session (local clear) |
| `transport-mode` | Service transport flag |
| `hv-fault` | HV safety fault (no clear) |

## 6. Recovery Wizard Steps

1. Connect vehicle  
2. Verify safe physical state  
3. Identify diagnostic interfaces  
4. Scan modules  
5. Read DTCs and state  
6. Determine Service Mode root cause  
7. Check recovery prerequisites  
8. Display available authorized recovery actions  
9. Execute operator-approved recovery  
10. Rescan vehicle  
11. Verify normal vehicle state  

Before every state-changing command the UI shows service, ECU, effect, risk, payload, and requires approval. Unknown experimental commands are never auto-executed.

## 7. Authorization Boundary Behavior

`SecurityAccess` may **requestSeed** only to document the boundary. `sendKey` throws:

`OEM AUTHORIZATION REQUIRED`

Escalation outputs:

- `artifacts/escalation.md` (human)
- `artifacts/escalation.json` (machine)

VIN is included only if the operator passes `--vin`.

## 8. Live Writes Policy

Live write capability remains disabled until:

1. `bun test` passes  
2. `--mode live-write`  
3. `--enable-live-write`  
4. Per-command operator approval  

Live DoIP open is intentionally fail-closed until `LUCID_DOIP_HOST` is set and automotive Ethernet link is operator-confirmed (see checklist).

## 9. Dependencies

- Runtime: Bun (TypeScript)  
- No native CAN/DoIP libraries required for simulator path  
- Live adapters: OS SocketCAN / operator-supplied DoIP host (HAL stubs ready)

## 10. Safety & Legal

For physically owned vehicles and lawful repair activity only. Respect local right-to-repair and cybersecurity law. Do not use this project to steal vehicles, defeat theft protections, or circumvent OEM cryptographic controls.
