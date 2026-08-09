# Live Vehicle Checklist — Lucid Air

Use this only on a vehicle you own (or are explicitly authorized to service). Start **read-only**.

## Hardware

| Item | Required | Notes |
| --- | --- | --- |
| Laptop with this utility | Yes | Bun ≥ 1.1 |
| Automotive Ethernet / DoIP adapter | Yes (likely) | Consumer USB-RJ45 may be wrong PHY for 100BASE-T1 |
| Lucid trunk diagnostic cable / pin access | Yes | Port reported in trunk service area [CONFIRMED existence; pinout UNKNOWN] |
| USB-CAN / CAN-FD interface (optional) | Optional | Passive sniff of edge CAN only |
| 12V jump pack (12–14.4 V, ≤50 A) | Recommended | Follow owner manual jump points |
| Multimeter | Recommended | Verify LV health before writes |

**Recommended primary interface:** DoIP via proper automotive Ethernet media converter into the trunk diagnostic port.  
**Not recommended as primary:** Classic OBD-II dongle (Lucid Air typically has no J1962 port) [CONFIRMED].

## Software Dependencies

```bash
cd lucid-service-recovery
bun install   # if adding deps later; currently stdlib-only
bun test      # MUST pass before any --mode live-write
```

Environment variables (live):

- `LUCID_DOIP_HOST` — vehicle diagnostic IPv4 after link-up
- `LUCID_DOIP_PORT` — default `13400`
- `LUCID_SOCKETCAN_IFACE` — e.g. `can0` (optional)

## Operator Actions

1. Park vehicle, engage parking brake, chock wheels if on incline.
2. Confirm no active HV repair; if crash/HV damage suspected, stop and use professional EV/HV procedures.
3. Ensure 12V healthy; jump per owner manual if needed.
4. Connect automotive Ethernet adapter to trunk diagnostic port.
5. Run interface discovery:

```bash
bun run src/cli.ts interfaces
```

6. Run **read-only** scan (live path currently fail-closed until operator confirms link — use simulator until DoIP host is validated):

```bash
bun run src/cli.ts wizard --mode live-readonly
```

7. Review root-cause hypotheses. If top cause is OEM authorization, generate escalation package and contact Lucid — do **not** attempt SecurityAccess keys.
8. Only after `bun test` passes and you understand each command:

```bash
bun run src/cli.ts wizard --mode live-write --enable-live-write
```

Every write still requires interactive approval.

## What Success Looks Like

- Service Mode flags clear **and**
- No active safety DTCs blocking operation **and**
- Gateway healthy / modules communicating **and**
- Vehicle UI no longer shows Service/Transport restriction

If clear requires NRC 0x33 / seed-key / backend token: **STOP** and submit `artifacts/escalation.md` + `escalation.json` to Lucid service.

## Explicit Non-Actions

- No seed-key calculation
- No certificate/token forging
- No firmware flash
- No CAN fuzz/replay
- No immobilizer/ADAS/HV interlock bypass
