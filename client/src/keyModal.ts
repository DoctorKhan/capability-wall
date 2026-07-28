/** In-page OpenRouter key entry — replaces window.prompt for live GitHub Pages. */

import { getOpenRouterKey, getStoredKey, setStoredKey } from "./keyStore";

export interface KeyModalOptions {
  onSaved?: () => void;
}

const boundDocuments = new WeakSet<Document>();

function maskKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export function openKeyModal(_opts?: KeyModalOptions, root: Document = document): void {
  const modal = root.getElementById("key-modal");
  const input = root.getElementById("key-input") as HTMLInputElement | null;
  const current = root.getElementById("key-current");
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

export function closeKeyModal(root: Document = document): void {
  const modal = root.getElementById("key-modal");
  if (modal) modal.hidden = true;
}

export function bindKeyModal(opts: KeyModalOptions = {}, root: Document = document): void {
  if (boundDocuments.has(root)) return;
  boundDocuments.add(root);

  const modal = root.getElementById("key-modal");
  const form = root.getElementById("key-form") as HTMLFormElement | null;
  const input = root.getElementById("key-input") as HTMLInputElement | null;
  const clearBtn = root.getElementById("key-clear");
  const cancelBtn = root.getElementById("key-cancel");
  const openBtn = root.getElementById("key-status");
  const briefingBtn = root.getElementById("briefing-add-key");

  openBtn?.addEventListener("click", () => openKeyModal(opts, root));
  briefingBtn?.addEventListener("click", () => openKeyModal(opts, root));

  cancelBtn?.addEventListener("click", () => closeKeyModal(root));
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeKeyModal(root);
  });

  clearBtn?.addEventListener("click", () => {
    setStoredKey(null);
    if (input) input.value = "";
    opts.onSaved?.();
    closeKeyModal(root);
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input?.value.trim() ?? "";
    setStoredKey(value || null);
    opts.onSaved?.();
    closeKeyModal(root);
  });
}

export function keyStatusLabel(): string {
  return getOpenRouterKey() ? "OpenRouter live" : "Add OpenRouter key";
}

export function hasLiveKey(): boolean {
  return !!getOpenRouterKey();
}
