# Architecture Assessment — Lucid Air Service Mode Recovery Utility

## 1. Mission Boundary

This utility performs **authorized, owner-operated, non-destructive diagnostics** on a Lucid Air that is physically owned by the operator. It maximizes legitimate local discovery and safe recovery while enforcing a hard stop at OEM authentication, cryptographic security access, and safety-critical systems.

**Default posture:** READ-ONLY. Live write capability remains disabled until the simulator test suite passes and the operator explicitly enables writes with per-command approval.

## 2. What Public Evidence Supports

| Finding | Confidence | Source class |
| --- | --- | --- |
| Lucid Air lacks a classic OBD-II diagnostic port used by most ICE/EV platforms | CONFIRMED | Owner forums + owner manual silence on OBD-II connector |
| Trunk/service area exposes an Ethernet-style diagnostic interface | CONFIRMED | Owner observations of Lucid tech laptop + RJ45-looking port under trunk lighter area |
| Internal vehicle networking is largely Automotive Ethernet; CAN is used for some edge peripherals | LIKELY | Owner technical discussion (CAN sniffing / Ethernet ring) |
| Dealer/service tooling uses DoIP (ISO 13400) + UDS (ISO 14229) | LIKELY | DIY diagnostic reports claiming DoIP ECU enumeration + UDS sessions |
| “Service Mode” after crash/salvage can impose severe speed limits (~5 mph) and may require Lucid backend/service authorization | CONFIRMED (behavior reported) / UNKNOWN (exact ECU flag & DID map) | Owner reports, salvage/right-to-repair coverage |
| Owner-accessible **Flatbed Transport Mode** (Settings → Vehicle) is distinct from service-set **Transport Mode** | CONFIRMED | Lucid owner/transporter documentation |
| Soft resets (Pilot Panel Air logo hold ~20s; Lucid-described turn-signal / key-card procedures) are owner-accessible | CONFIRMED / LIKELY | Owner forum consolidation of Lucid-provided reset guidance |
| Exact UDS DIDs, security levels, and Service Mode clear routines are not publicly documented by Lucid | UNKNOWN | No OEM public service API / DID catalog located |

## 3. Implied Diagnostic Architecture (Working Model)

```
┌─────────────────────────────────────────────────────────────┐
│ Operator Host (this utility)                                 │
│  UI Wizard → Scanner → RootCause → SafeRecovery → Reports    │
└───────────────┬───────────────────────────┬─────────────────┘
                │ READ-ONLY default         │ approved writes only
                ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│ Transport HAL            │   │ Audit Log (append-only)      │
│  DoIP / ISO-TP / SocketCAN│   └──────────────────────────────┘
└───────────────┬──────────┘
                ▼
┌──────────────────────────┐
│ UDS Client (ISO 14229)   │  Sessions: default / extended (read)
│  SecurityAccess: REPORT  │  NEVER key calc / crack / forge
│  ONLY, never unlock      │
└───────────────┬──────────┘
                ▼
┌──────────────────────────┐
│ Vehicle Gateway / ECUs   │  (live or Simulator)
└──────────────────────────┘
```

### Transport priority for Lucid Air

1. **DoIP over Ethernet** — primary expected path (LIKELY)
2. **ISO-TP over CAN/CAN-FD** — secondary / peripheral (LIKELY for edge modules)
3. **Classic OBD-II PIDs** — generally unavailable on Lucid Air (CONFIRMED absence of standard OBD port); adapter kept for generic EV/test benches only

### Recommended hardware (live vehicle)

| Interface | Recommendation | Notes |
| --- | --- | --- |
| DoIP | Automotive Ethernet media converter / OEM-compatible DoIP adapter + trunk diagnostic cable | Ordinary consumer RJ45 may be electrically incorrect for BroadR-Reach/100BASE-T1 |
| CAN | Peak PCAN / SocketCAN USB-CAN-FD (optional) | Passive sniff first; no replay |
| Power | External 12V jumper pack if LV is weak | Follow owner manual jump points; never exceed ratings |

## 4. Software Layering

| Layer | Responsibility |
| --- | --- |
| `transport/` | HAL: discover, open, RX/TX bytes, capability probe; no UDS semantics |
| `protocol/uds` | Encode/decode ISO 14229; session + NRC handling; SecurityAccess stub |
| `vehicle/lucid` | ECU registry, DID catalog (known + unknown), mode taxonomy, knowledge tags |
| `diagnostics/` | Scanner, DTC parser, state model, root-cause engine |
| `recovery/` | Prerequisite checks, allow-listed safe actions, authorization boundary |
| `simulator/` | Multi-ECU DoIP/UDS + CAN scenarios for offline development |
| `reports/` | Human markdown + machine JSON escalation packages |
| `ui/` | Guided recovery wizard (CLI) |
| `audit/` | Immutable command audit trail |

## 5. Authorization Boundary (Hard Stop)

If any of the following is required and unavailable, the tool **stops** and emits an OEM AUTHORIZATION REQUIRED escalation package:

- UDS SecurityAccess seed→key for a protected level
- OEM-signed routine / certificate / backend token
- Dealer diagnostic identity
- Firmware flash / identity / immobilizer / restraint / HV interlock clear

The tool continues all **non-privileged** diagnostics around that boundary.

## 6. Safety Model Summary

- No automatic state-changing commands
- No CAN fuzzing / unknown replay
- No SecurityAccess key derivation
- No unsigned firmware
- Explicit operator approval for every write
- Simulator gate: live writes disabled until tests pass + opt-in flag

See `docs/SAFETY_MODEL.md` and `docs/THREAT_MODEL.md`.

## 7. Information / Research Gaps

1. Official Lucid DoIP entity IDs / logical addresses — UNKNOWN
2. Official Service Mode DID / DTC / routine IDs — UNKNOWN
3. Exact security access levels for mode clear — UNKNOWN
4. Whether salvage/crash Service Mode is gateway-local or backend-bound — INFERRED backend/service required from owner reports
5. Full ECU topology / software part numbers — UNKNOWN (discoverable read-only if live DoIP works)
6. Legal availability of Lucid service manuals to independent repairers by jurisdiction — UNKNOWN / varies

## 8. Implementation Plan

| Phase | Deliverable |
| --- | --- |
| 1 | Research + assessment (this doc) |
| 2 | Repo structure + knowledge base |
| 3 | Transport HAL + read-only UDS |
| 4 | Full simulator + scenarios |
| 5 | Root-cause engine |
| 6 | Safe recovery allow-list |
| 7 | Recovery wizard UI |
| 8 | Escalation package generator |
| 9 | Unit + integration tests |
| 10 | Live vehicle checklist |

## 9. Repository Structure

```
lucid-service-recovery/
  README.md
  package.json
  docs/
    ARCHITECTURE.md
    THREAT_MODEL.md
    SAFETY_MODEL.md
    LIVE_VEHICLE_CHECKLIST.md
  knowledge/
    lucid-air.md          # tagged CONFIRMED/LIKELY/INFERRED/UNKNOWN
  src/
    index.ts
    cli.ts
    shared/
    transport/
    protocol/uds/
    vehicle/lucid/
    diagnostics/
    recovery/
    simulator/
    reports/
    ui/
    audit/
  tests/
```
