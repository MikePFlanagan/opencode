# Safety Model

## Operating Modes

| Mode | Bus TX | State-changing UDS | Notes |
| --- | --- | --- | --- |
| `simulate` | Simulator only | Allowed inside simulator | Default for development |
| `live-readonly` | DoIP/UDS read + TesterPresent | Denied | Default for first live connect |
| `live-write` | Allow-listed actions only | Per-command approval | Requires `--enable-live-write` AND passed simulator suite |

## Preconditions for Any Live Connection

1. Vehicle in Park / immobilized with parking brake engaged
2. Operator confirms physical ownership / authorization
3. HV work not in progress; no crash-damaged HV battery without professional assessment
4. Adequate 12V support available
5. Tool started in read-only unless explicitly escalated

## Allowed State-Changing Actions (Allow-List)

Only these may ever be offered, and only when prerequisites pass:

1. `DiagnosticSessionControl` → default session (0x01) — end leftover session
2. `TesterPresent` keep-alive during approved session
3. `ECUReset` soft reset (0x11 0x01) — only for non-safety-critical modules on allow-list
4. Clear **non-safety** DTCs when NRC allows and operator approves
5. Re-scan / verify after action

## Forbidden Actions

- SecurityAccess key send (0x27 with key)
- CommunicationControl silencing safety networks
- RoutineControl for unknown / OEM-signed routines
- RequestDownload / TransferData / flash
- WriteDataByIdentifier for VIN, odometer, keys, ADAS calibration, HV interlocks
- CAN fuzz / blind replay
- Any command discovered solely by experiment

## Approval Gate

Before every state-changing command the UI must show:

1. Exact service ID + payload hex
2. Target ECU name + address
3. Effect description
4. Risk level
5. Prerequisite checklist result
6. Explicit yes/no operator confirmation

All attempts (approved or denied) are append-logged to the audit trail.
