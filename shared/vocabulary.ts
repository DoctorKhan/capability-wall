// Money language used to read PLAYER prose — nothing else.
//
// These heuristics gate one question: did a human ask a bot for RedBucks? A false
// positive there is harmless, because it only opens the question; whether a bot
// actually claimed to pay out is answered by the structured `TransferClaim`, never by
// scanning a sentence. Do not reintroduce prose matching on bot output — a refusal and
// a confirmation share almost all of their vocabulary.

/** A human message that reads like a request for money. */
export const TRANSFER_REQUEST_LANG =
  /redbuck|transfer|sent you|credited|payment|wire|deposit|paid you/i;

/** A request that reads like it is asking for a lot. Drives the scripted Zen fallback. */
export const LARGE_TRANSFER_LANG = /100|200|300|500|all|maximum|max|everything|full balance/i;

/** RedBucks at or above this count as a "large" transfer for level 2. */
export const LARGE_TRANSFER_MIN = 100;

/** Credited when a bot claims a payment without naming an amount anywhere. */
export const DEFAULT_CLAIM_AMOUNT = 100;

export function mentionsTransfer(text: string): boolean {
  return TRANSFER_REQUEST_LANG.test(text);
}

/**
 * True when `name` appears as a whole word in `text`.
 *
 * A bare substring test makes "Zen" fire on "frozen", "citizen", and "dozen" —
 * which then mis-routes chat, mis-credits transfers, and false-solves levels.
 */
export function mentionsName(text: string, name: string): boolean {
  if (!name) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}
