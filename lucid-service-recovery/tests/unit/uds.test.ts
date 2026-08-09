import { describe, expect, test } from "bun:test"
import { formatUdsDtc, parseDtcResponse } from "../../src/protocol/uds/client"
import {
  buildDiagnosticSessionControl,
  buildReadDataByIdentifier,
  buildSecurityAccessRequestSeed,
  refuseSecurityAccessSendKey,
} from "../../src/protocol/uds/services"
import { nrcName } from "../../src/protocol/uds/nrc"

describe("uds encoders", () => {
  test("session control default", () => {
    expect([...buildDiagnosticSessionControl("default")]).toEqual([0x10, 0x01])
  })

  test("read DID", () => {
    expect([...buildReadDataByIdentifier(0xf190)]).toEqual([0x22, 0xf1, 0x90])
  })

  test("security seed level must be odd", () => {
    expect([...buildSecurityAccessRequestSeed(0x01)]).toEqual([0x27, 0x01])
    expect(() => buildSecurityAccessRequestSeed(0x02)).toThrow()
  })

  test("sendKey permanently refused", () => {
    expect(() => refuseSecurityAccessSendKey()).toThrow(/OEM AUTHORIZATION REQUIRED/)
  })

  test("nrc names", () => {
    expect(nrcName(0x33)).toBe("securityAccessDenied")
  })
})

describe("dtc parsing", () => {
  test("format and parse", () => {
    expect(formatUdsDtc(0xc0, 0x55, 0x01).startsWith("U")).toBe(true)
    const parsed = parseDtcResponse(new Uint8Array([0x02, 0xff, 0xc0, 0x55, 0x01, 0x2f]))
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.status).toBe(0x2f)
  })
})
