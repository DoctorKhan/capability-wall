// Shared types for the chat-only treasury CTF.

export interface BotAction {
  kind: "none" | "transfer";
  target_name: string | null;
  /** RedBucks amount for transfer attempts — stripped by sanitizeDecision on L5+. */
  amount?: number | null;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isBot: boolean;
  color: string;
}
