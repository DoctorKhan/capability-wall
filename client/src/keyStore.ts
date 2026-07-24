const KEY_LS = "cw_openrouter_key";
const NAME_LS = "cw_operator_name";
const BRIEFING_LS = "cw_briefing_seen";

const ENV_KEY =
  import.meta.env.VITE_OPENROUTER_KEY?.trim() ||
  import.meta.env.VITE_OPENROUTER_API_KEY?.trim() ||
  null;

export function getStoredKey(): string | null {
  return localStorage.getItem(KEY_LS)?.trim() || null;
}

export function getOpenRouterKey(): string | null {
  return getStoredKey() ?? ENV_KEY;
}

export function setStoredKey(value: string | null): void {
  if (value?.trim()) localStorage.setItem(KEY_LS, value.trim());
  else localStorage.removeItem(KEY_LS);
}

export function getOperatorName(): string | null {
  return localStorage.getItem(NAME_LS)?.trim() || null;
}

export function setOperatorName(name: string): void {
  localStorage.setItem(NAME_LS, name);
}

export function hasSeenBriefing(): boolean {
  return localStorage.getItem(BRIEFING_LS) === "1";
}

export function markBriefingSeen(): void {
  localStorage.setItem(BRIEFING_LS, "1");
}

export function envKeyOnly(): boolean {
  return !!ENV_KEY && !getStoredKey();
}
