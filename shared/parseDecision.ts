// Parse and validate OpenRouter strict-json decision payloads before sanitizeDecision.
//
// This module is intentionally loose: it extracts a shape, never normalizes. Amount floors,
// recipient trimming, and claim drop rules live only in sanitizeClaim / sanitizeDecision.

import type { BotAction, TransferClaim } from "./protocol";

export interface ParsedDecisionPayload {
  action: BotAction;
  say: string | null;
  /** Pre-sanitize claim — may still have empty `to` or non-positive `amount`. */
  claim: TransferClaim | null;
}

function readClaim(value: unknown): TransferClaim | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    to: typeof record.to === "string" ? record.to : null,
    amount:
      typeof record.amount === "number" && Number.isFinite(record.amount)
        ? record.amount
        : null,
  };
}

function readAction(value: unknown): BotAction {
  if (!value || typeof value !== "object") {
    return { kind: "none", target_name: null, amount: null };
  }
  const record = value as Record<string, unknown>;
  const kind = record.kind === "transfer" ? "transfer" : "none";
  const target_name = typeof record.target_name === "string" ? record.target_name : null;
  const amount =
    typeof record.amount === "number" && Number.isFinite(record.amount) ? record.amount : null;
  return { kind, target_name, amount };
}

/** Fail-closed parse of model JSON — never throws. Missing claim → null, not a parse failure. */
export function parseDecisionPayload(text: string): ParsedDecisionPayload | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (!record.action || typeof record.action !== "object") return null;
    const say =
      typeof record.say === "string" ? record.say : record.say === null ? null : null;
    return {
      action: readAction(record.action),
      say,
      claim: readClaim(record.claimed_transfer),
    };
  } catch {
    return null;
  }
}
