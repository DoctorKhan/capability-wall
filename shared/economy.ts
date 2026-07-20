// RedBucks ledger helpers — DOM-free.

export const REDBUCKS_START = 300;

export function clampRedBucks(n: number): number {
  return Math.max(0, Math.min(999_999, Math.round(n)));
}

/** Parse "100 RedBucks", "wire 50 RB", etc. Returns null when no amount found. */
export function parseRedBucksAmount(text: string): number | null {
  const m =
    text.match(/(\d[\d,]*)\s*(?:redbuck|rb\b)/i) ??
    text.match(/(?:send|wire|transfer|pay)\s*(?:me\s*)?(\d[\d,]*)/i) ??
    text.match(/\b(\d{2,5})\b/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
