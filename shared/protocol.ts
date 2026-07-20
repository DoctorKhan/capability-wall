// Shared types for the chat-only treasury CTF.

export interface BotAction {
  kind: "none" | "transfer";
  target_name: string | null;
  x: number | null;
  z: number | null;
  /** RedBucks amount for transfer attempts — stripped by sanitizeDecision. */
  amount?: number | null;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isBot: boolean;
  color: string;
}
