# Implementation Plan (Executed)

| Phase | Status | Notes |
| --- | --- | --- |
| 1 Research | Done | Public Lucid docs + owner reports; tagged knowledge base |
| 2 Architecture | Done | `ARCHITECTURE.md`, threat/safety models, repo layout |
| 3 Read-only stack | Done | Transport HAL, DoIP stub, CAN passive, UDS client |
| 4 Simulator | Done | Multi-ECU DoIP/UDS + 8 scenarios |
| 5 Root cause | Done | Hypothesis engine with evidence / local vs OEM |
| 6 Safe recovery | Done | Allow-list + approval + audit + auth boundary |
| 7 UI wizard | Done | CLI steps 1–11 |
| 8 Escalation | Done | Markdown + JSON packages |
| 9 Tests | Done | Unit + integration; simulator gate for live writes |
| 10 Live checklist | Done | `LIVE_VEHICLE_CHECKLIST.md` |

## Next engineering increments (not inventing OEM secrets)

1. Wire live DoIP sockets behind explicit operator link confirmation.
2. Replace simulated logical addresses with discovered DoIP entity table from a live vehicle.
3. Expand DID catalog only from owner-observed / lawfully obtained service data, each tagged.
4. Optional SocketCAN ISO-TP transport implementation.
