// Parse and validate OpenRouter strict-json decision payloads before sanitizeDecision.

import type { BotAction } from "./protocol";

export interface ParsedDecisionPayload {
  action: BotAction;
  say: string | null;
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

/** Fail-closed parse of model JSON — never throws. */
export function parseDecisionPayload(text: string): ParsedDecisionPayload | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (!record.action || typeof record.action !== "object") return null;
    const say =
      typeof record.say === "string" ? record.say : record.say === null ? null : null;
    return { action: readAction(record.action), say };
  } catch {
    return null;
  }
}
