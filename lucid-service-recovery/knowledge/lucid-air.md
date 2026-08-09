# Lucid Air Diagnostic Knowledge Base

Tags: `CONFIRMED` | `LIKELY` | `INFERRED` | `UNKNOWN`

## Connector & Transport

- [CONFIRMED] Lucid Air does not expose a conventional SAE J1962 OBD-II diagnostic port like many other vehicles.
- [CONFIRMED] A service/diagnostic Ethernet-style port exists in the trunk area (reported under/near lighter plug / service access). Lucid technicians have been observed connecting a laptop there.
- [LIKELY] Primary enhanced diagnostics use DoIP (ISO 13400) and UDS (ISO 14229).
- [LIKELY] Backbone messaging is largely Automotive Ethernet; CAN exists for some edge peripherals.
- [UNKNOWN] Exact DoIP protocol version, logical addressing map, and entity IDs for production vehicles.
- [UNKNOWN] Whether the physical port is 100BASE-TX or 100BASE-T1 (BroadR-Reach). Owner reports conflict; treat as requiring a proper automotive Ethernet adapter.

## Operating Modes (Taxonomy)

| Mode | Owner accessible? | Typical effect | Confidence |
| --- | --- | --- | --- |
| Flatbed Transport Mode | Yes — Settings → Vehicle | Neutral/Park only for loading; disables anti-theft during prep | CONFIRMED |
| Tow Truck / related tow assists | Partially (UI / brake) | Aids loading | LIKELY (naming varies by software) |
| Service Transport Mode | No — service/remote | Speed/ADAS limited (~30 mph reported) | LIKELY |
| Crash/Salvage Service Mode | No — Lucid service/backend | Severe limit (~5 mph reported) until OEM procedure | CONFIRMED (reports) / UNKNOWN (mechanism) |
| Active UDS diagnostic session | Tool-dependent | May alter communication / inhibit some functions | LIKELY (UDS general) |

**Do not assume** these modes share one global “off” switch.

## Owner Soft Reset Procedures

- [CONFIRMED / LIKELY] Pilot Panel: Settings → About → press and hold Lucid Air logo ~20 seconds to reboot.
- [LIKELY] Lucid-described turn-signal / key-card soft reset procedures exist for recovering electronics (see owner forum consolidation of Lucid guidance).
- [INFERRED] Soft resets may clear transient UI/session issues but will **not** clear OEM-locked salvage/crash Service Mode.

## 12V / Power

- [CONFIRMED] Vehicle uses dual 12V AGM batteries (owner manual) plus HV pack.
- [CONFIRMED] External 12V jump points exist for dead LV systems (owner/transporter docs).
- [INFERRED] Low 12V can produce gateway/module communication failures that look like “service” or limp behavior — always check LV health early.

## Service Mode Exit Reality

- [CONFIRMED] Owner reports repeatedly state Lucid service laptop / remote authorization is required for crash/salvage Service Mode.
- [UNKNOWN] Specific UDS routine, DID, or backend API that clears Service Mode.
- [INFERRED] If SecurityAccess or OEM signature is required, local recovery is impossible without Lucid.

## Right-to-Repair / Documentation

- [UNKNOWN] Jurisdiction-specific access to Lucid service information for independent repairers.
- This tool only embeds publicly observable / owner-manual facts and standard ISO diagnostic behavior.
