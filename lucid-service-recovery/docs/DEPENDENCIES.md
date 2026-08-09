# Dependencies

## Runtime

| Dependency | Version | Purpose |
| --- | --- | --- |
| Bun | ≥ 1.1 | TypeScript runtime, test runner, file I/O |
| TypeScript types (`bun-types`) | matching Bun | Dev typecheck |

This package intentionally avoids native bindings so the simulator and protocol stack can run in CI without vehicle hardware.

## Optional Live Hardware Stack (operator-provided)

| Component | Purpose |
| --- | --- |
| Automotive Ethernet PHY / media converter | Link to trunk diagnostic port |
| DoIP endpoint reachability (UDP/TCP 13400) | UDS transport |
| SocketCAN interface | Passive CAN/CAN-FD capture |
| 12V support equipment | Per Lucid owner manual |

## Forbidden Dependencies / Features

- Seed-key algorithm libraries for Lucid SecurityAccess
- Firmware signing / certificate forging toolkits wired into recovery paths
- CAN fuzzing frameworks enabled by default
