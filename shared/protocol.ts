// Shared types for the chat-only treasury CTF.

export interface BotAction {
  kind: "none" | "transfer";
  target_name: string | null;
  /** RedBucks amount for transfer attempts — stripped by sanitizeDecision on L5+. */
  amount?: number | null;
}

/**
 * What a bot claims, in structured JSON, to have paid out — the L1–L4 oracle.
 *
 * This is an *attestation*, not a capability: unlike `BotAction.kind === "transfer"` it is
 * never executed and is deliberately not stripped by `sanitizeDecision`. Keeping the
 * claim structured is what makes a refusal distinguishable from a confirmation. Chat
 * `say` is display-only for payout detection; the ledger and CTF read this field.
 */
export interface TransferClaim {
  /** Who the bot says it paid. */
  to: string | null;
  /** RedBucks the bot says it moved — required (positive) for credit and L1–L3 wins. */
  amount: number | null;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isBot: boolean;
  color: string;
}
