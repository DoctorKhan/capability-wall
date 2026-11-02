/**
 * Small local teaching model of the ACS pre-effect decision point.
 *
 * This deliberately is not an ACS client: it emits no JSON-RPC envelope,
 * signature, handshake, session chain, or network request. It makes the
 * proposed-effect → Guardian verdict → enforced outcome visible in the CTF.
 */

import type { BotAction } from "./protocol";

export interface SimulatedAcsDecision {
  method: "steps/toolCallRequest";
  decision: "allow" | "deny";
  reasoning: string;
}

export function simulateAcsToolDecision(action: BotAction): SimulatedAcsDecision | null {
  if (action.kind !== "transfer") return null;
  return {
    method: "steps/toolCallRequest",
    decision: "deny",
    reasoning: "No verified payment capability exists; transfer intent is removed before ledger execution. Claim-attestation credit is a separate intentional L1–L4 flaw.",
  };
}
