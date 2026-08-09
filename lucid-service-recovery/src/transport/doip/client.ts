import { createLogger } from "../../shared/log"
import type { TransportCapabilities, UdsTransport } from "../types"

const log = createLogger("transport.doip")

/**
 * Live DoIP client skeleton.
 * Does not impersonate Lucid backends. Connects only to an operator-supplied host.
 * Without LUCID_DOIP_HOST, open() fails closed.
 */
export class DoipTransport implements UdsTransport {
  readonly capabilities: TransportCapabilities = {
    kind: "doip",
    readOnly: true,
    supportsDiscovery: true,
    supportsUds: true,
    supportsPassiveCapture: false,
    maxPayload: 4095,
  }

  private host: string | undefined
  private port: number

  constructor(opts?: { host?: string; port?: number; readOnly?: boolean }) {
    this.host = opts?.host ?? process.env.LUCID_DOIP_HOST
    this.port = opts?.port ?? Number(process.env.LUCID_DOIP_PORT ?? 13400)
    if (opts?.readOnly === false) this.capabilities.readOnly = false
  }

  async open(): Promise<void> {
    if (!this.host) {
      throw new Error(
        "DoIP host not configured. Set LUCID_DOIP_HOST to the vehicle diagnostic IP after media conversion. Remaining in fail-closed state.",
      )
    }
    log.info("DoIP open requested", { host: this.host, port: this.port, readOnly: this.capabilities.readOnly })
    // Live socket path intentionally not auto-probed against arbitrary networks.
    throw new Error(
      "Live DoIP socket connect is gated pending operator confirmation of automotive Ethernet link. Use --mode simulate for development.",
    )
  }

  async close(): Promise<void> {
    log.info("DoIP closed")
  }

  async request(_logicalAddress: number, _payload: Uint8Array): Promise<Uint8Array> {
    throw new Error("Live DoIP request unavailable — transport not open")
  }
}
