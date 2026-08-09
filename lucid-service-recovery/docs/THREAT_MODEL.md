# Threat Model

## Assets

- Vehicle operational integrity (drive, brake, steer, HV, restraints)
- Cryptographic/security credentials (seeds, keys, certificates) — **never stored or derived**
- Owner VIN / PII entered into reports
- Diagnostic session state on ECUs
- Audit trail integrity

## Adversaries / Misuse Cases

| Threat | Mitigation |
| --- | --- |
| Tool used to bypass immobilizer / theft protection | No immobilizer/security APIs; SecurityAccess never unlocks |
| Tool used to forge OEM auth | No certificate/token/signature generation |
| Accidental destructive UDS routine | Allow-list only; approval gate; read-only default |
| CAN bus injection / replay of unknown frames | Passive capture default; replay disabled |
| Credential cracking of SecurityAccess | Explicitly unimplemented; reports OEM AUTHORIZATION REQUIRED |
| Silent live writes during development | Simulator gate; `OPEN_WRITE=false` default |
| Escalation package leaks VIN | VIN only if operator explicitly provides |

## Trust Boundaries

1. Operator ↔ Utility (local CLI; operator is trusted for physical ownership claims)
2. Utility ↔ Transport adapter (treat bus as hostile; validate lengths/NRC)
3. Utility ↔ ECU (untrusted remote; never trust positive responses without re-read)
4. Utility ↔ Lucid backend (out of scope; never impersonate)

## Non-Goals (Explicit)

- Reverse engineering proprietary seed-key algorithms
- MITM of Lucid backend or service laptops
- Flashing / coding / as-built identity changes
