import type { AuthorizationBoundary } from "../shared/types"
import { UdsClient } from "../protocol/uds/client"
import type { UdsTransport } from "../transport/types"
import { ecuByName } from "../vehicle/lucid/ecu_registry"

export async function probeModeClearAuthorization(transport: UdsTransport): Promise<AuthorizationBoundary> {
  const cgw = ecuByName("CGW")
  const client = new UdsClient(transport, cgw.logicalAddress, cgw.name)
  await client.diagnosticSessionControl("extended")
  // Probe seed only — never send key
  return client.securityAccessProbe(0x01)
}

export function formatAuthorizationBoundary(boundary: AuthorizationBoundary): string {
  return [
    boundary.message,
    `ECU: ${boundary.ecu}`,
    `Service: ${boundary.service}`,
    `Security level: ${boundary.securityLevel ?? "n/a"}`,
    `Diagnostic state: ${boundary.diagnosticState}`,
    `Why: ${boundary.reason}`,
    `Available identifiers: ${boundary.availableIdentifiers.join(", ") || "(none)"}`,
  ].join("\n")
}
