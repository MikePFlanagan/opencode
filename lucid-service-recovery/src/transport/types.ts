import type { TransportKind } from "../shared/types"

export interface TransportCapabilities {
  kind: TransportKind
  readOnly: boolean
  supportsDiscovery: boolean
  supportsUds: boolean
  supportsPassiveCapture: boolean
  maxPayload: number
}

export interface DiscoveredInterface {
  id: string
  kind: TransportKind
  label: string
  available: boolean
  detail: string
}

export interface CanFrame {
  tsMs: number
  id: number
  ide: boolean
  rtr: boolean
  fdf: boolean
  data: Uint8Array
  channel: string
}

export interface UdsTransport {
  readonly capabilities: TransportCapabilities
  open(): Promise<void>
  close(): Promise<void>
  request(logicalAddress: number, payload: Uint8Array, timeoutMs?: number): Promise<Uint8Array>
  passiveCapture?(durationMs: number): Promise<CanFrame[]>
}
