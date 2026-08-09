export const NRC_NAMES: Record<number, string> = {
  0x10: "generalReject",
  0x11: "serviceNotSupported",
  0x12: "subFunctionNotSupported",
  0x13: "incorrectMessageLengthOrInvalidFormat",
  0x14: "responseTooLong",
  0x22: "conditionsNotCorrect",
  0x24: "requestSequenceError",
  0x31: "requestOutOfRange",
  0x33: "securityAccessDenied",
  0x35: "invalidKey",
  0x36: "exceedNumberOfAttempts",
  0x37: "requiredTimeDelayNotExpired",
  0x70: "uploadDownloadNotAccepted",
  0x72: "generalProgrammingFailure",
  0x78: "requestCorrectlyReceivedResponsePending",
  0x7e: "subFunctionNotSupportedInActiveSession",
  0x7f: "serviceNotSupportedInActiveSession",
}

export function nrcName(code: number): string {
  return NRC_NAMES[code] ?? `unknownNrc_0x${code.toString(16)}`
}
