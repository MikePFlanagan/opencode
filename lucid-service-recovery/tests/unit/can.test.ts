import { describe, expect, test } from "bun:test"
import { analyzeCanCapture, assertNoReplay, diffCanCaptures } from "../../src/transport/can/passive"
import type { CanFrame } from "../../src/transport/types"

function frame(id: number, tsMs: number): CanFrame {
  return { id, tsMs, ide: false, rtr: false, fdf: false, data: new Uint8Array([1]), channel: "t" }
}

describe("can safety", () => {
  test("analyze capture", () => {
    const frames = [frame(0x100, 0), frame(0x100, 10), frame(0x200, 20), frame(0x300, 30)]
    const stats = analyzeCanCapture(frames)
    expect(stats.frames).toBe(4)
    expect(stats.uniqueIds).toBe(3)
  })

  test("diff captures", () => {
    const diff = diffCanCaptures([frame(0x100, 0)], [frame(0x100, 0), frame(0x200, 1)])
    expect(diff.appeared).toContain("0x200")
  })

  test("replay forbidden", () => {
    expect(() => assertNoReplay()).toThrow(/forbidden/)
  })
})
