import { createLogger } from "../shared/log"
import type { DiscoveredInterface } from "./types"

const log = createLogger("transport.discovery")

/**
 * Probe host for diagnostic interfaces.
 * Live adapters are reported as unavailable unless explicitly present;
 * simulator is always available.
 */
export async function discoverInterfaces(opts?: { preferSimulator?: boolean }): Promise<DiscoveredInterface[]> {
  const preferSimulator = opts?.preferSimulator ?? true
  const interfaces: DiscoveredInterface[] = [
    {
      id: "sim-doip-0",
      kind: "simulator",
      label: "Embedded Lucid Air DoIP/UDS Simulator",
      available: true,
      detail: "Offline multi-ECU simulator with Service Mode scenarios",
    },
    {
      id: "doip-eth-0",
      kind: "doip",
      label: "DoIP over Ethernet (trunk diagnostic port)",
      available: await probeDoipHint(),
      detail:
        "Requires automotive Ethernet adapter + Lucid trunk diagnostic cable. Ordinary RJ45 may be electrically incorrect.",
    },
    {
      id: "socketcan-0",
      kind: "isotp-can",
      label: "SocketCAN / USB-CAN (ISO-TP)",
      available: await probeSocketCan(),
      detail: "Passive capture preferred. No fuzzing/replay.",
    },
    {
      id: "obd-0",
      kind: "obd",
      label: "Classic OBD-II adapter",
      available: false,
      detail:
        "Lucid Air typically has no J1962 OBD-II port [CONFIRMED]. Kept for bench/generic EV testing only.",
    },
  ]

  if (preferSimulator) {
    interfaces.sort((a, b) => Number(b.kind === "simulator") - Number(a.kind === "simulator"))
  }

  log.info("interface discovery complete", {
    available: interfaces.filter((i) => i.available).map((i) => i.id),
  })
  return interfaces
}

async function probeDoipHint(): Promise<boolean> {
  // Live DoIP requires operator-provided host; we only hint presence of env override.
  return Boolean(process.env.LUCID_DOIP_HOST)
}

async function probeSocketCan(): Promise<boolean> {
  if (process.env.LUCID_SOCKETCAN_IFACE) return true
  try {
    const file = Bun.file("/sys/class/net")
    // Presence of /sys/class/net does not mean can0 exists; keep false unless env set.
    void file
    return false
  } catch {
    return false
  }
}
