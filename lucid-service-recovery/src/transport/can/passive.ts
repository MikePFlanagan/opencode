import type { CanFrame } from "../types"

export interface CanCaptureStats {
  frames: number
  uniqueIds: number
  durationMs: number
  anomalies: string[]
}

export function analyzeCanCapture(frames: CanFrame[]): CanCaptureStats {
  const ids = new Set(frames.map((f) => f.id))
  const anomalies: string[] = []

  const byId = new Map<number, number>()
  for (const frame of frames) {
    byId.set(frame.id, (byId.get(frame.id) ?? 0) + 1)
  }

  for (const [id, count] of byId) {
    if (count === 1 && frames.length > 50) {
      anomalies.push(`rare ID 0x${id.toString(16)} appeared once`)
    }
  }

  const bursts = frames.filter((f, i) => {
    if (i === 0) return false
    return f.tsMs - frames[i - 1]!.tsMs < 0.05
  })
  if (bursts.length > frames.length * 0.4) {
    anomalies.push("high inter-frame burst density — possible bus storm")
  }

  return {
    frames: frames.length,
    uniqueIds: ids.size,
    durationMs: frames.length ? frames[frames.length - 1]!.tsMs - frames[0]!.tsMs : 0,
    anomalies,
  }
}

export function groupCanById(frames: CanFrame[]): Map<number, CanFrame[]> {
  const map = new Map<number, CanFrame[]>()
  for (const frame of frames) {
    const list = map.get(frame.id) ?? []
    list.push(frame)
    map.set(frame.id, list)
  }
  return map
}

export function diffCanCaptures(before: CanFrame[], after: CanFrame[]) {
  const beforeIds = new Set(before.map((f) => f.id))
  const afterIds = new Set(after.map((f) => f.id))
  const appeared = [...afterIds].filter((id) => !beforeIds.has(id))
  const disappeared = [...beforeIds].filter((id) => !afterIds.has(id))
  return {
    appeared: appeared.map((id) => `0x${id.toString(16)}`),
    disappeared: disappeared.map((id) => `0x${id.toString(16)}`),
  }
}

/**
 * Replay of unknown captured traffic is intentionally unsupported.
 */
export function assertNoReplay(): never {
  throw new Error("CAN replay of unknown traffic is forbidden by safety policy")
}
