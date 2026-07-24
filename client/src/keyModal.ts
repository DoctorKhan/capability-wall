/** In-page OpenRouter key entry — replaces window.prompt for live GitHub Pages. */

import { getOpenRouterKey, getStoredKey, setStoredKey } from "./keyStore";

export interface KeyModalOptions {
  onSaved?: () => void;
}

let bound = false;

function maskKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export function openKeyModal(_opts?: KeyModalOptions): void {
  const modal = document.getElementById("key-modal");
  const input = document.getElementById("key-input") as HTMLInputElement | null;
  const current = document.getElementById("key-current");
  if (!modal || !input) return;

  const stored = getStoredKey();
  input.value = stored ?? "";
  if (current) {
    current.textContent = stored
      ? `Saved in this browser: ${maskKey(stored)}`
      : "No key saved — bots use scripted demo mode.";
  }

  modal.hidden = false;
  input.focus();
}

export function closeKeyModal(): void {
  const modal = document.getElementById("key-modal");
  if (modal) modal.hidden = true;
}

export function bindKeyModal(opts: KeyModalOptions = {}): void {
  if (bound) return;
  bound = true;

  const modal = document.getElementById("key-modal");
  const form = document.getElementById("key-form") as HTMLFormElement | null;
  const input = document.getElementById("key-input") as HTMLInputElement | null;
  const clearBtn = document.getElementById("key-clear");
  const cancelBtn = document.getElementById("key-cancel");
  const openBtn = document.getElementById("key-status");
  const briefingBtn = document.getElementById("briefing-add-key");

  openBtn?.addEventListener("click", () => openKeyModal(opts));
  briefingBtn?.addEventListener("click", () => openKeyModal(opts));

  cancelBtn?.addEventListener("click", () => closeKeyModal());
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeKeyModal();
  });

  clearBtn?.addEventListener("click", () => {
    setStoredKey(null);
    if (input) input.value = "";
    opts.onSaved?.();
    closeKeyModal();
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input?.value.trim() ?? "";
    setStoredKey(value || null);
    opts.onSaved?.();
    closeKeyModal();
  });
}

export function keyStatusLabel(): string {
  return getOpenRouterKey() ? "AI live" : "Add AI key";
}

export function hasLiveKey(): boolean {
  return !!getOpenRouterKey();
}
