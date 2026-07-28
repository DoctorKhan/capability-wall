// @vitest-environment jsdom

// The key modal is the only place a visitor's OpenRouter key is handled. These tests
// cover masking (never render the whole key), persistence, and clearing.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMemoryLocalStorage } from "./helpers/memoryStorage";

const MARKUP = `
  <button id="key-status"></button>
  <button id="briefing-add-key"></button>
  <div id="key-modal" hidden>
    <form id="key-form">
      <input id="key-input" />
      <p id="key-current"></p>
      <button id="key-clear" type="button"></button>
      <button id="key-cancel" type="button"></button>
    </form>
  </div>
`;

async function loadModal() {
  vi.resetModules();
  return {
    modal: await import("../client/src/keyModal"),
    store: await import("../client/src/keyStore"),
  };
}

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const submitForm = () =>
  el<HTMLFormElement>("key-form").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  installMemoryLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("keyStatusLabel / hasLiveKey", () => {
  it("reports scripted mode when no key is stored", async () => {
    const { modal } = await loadModal();
    expect(modal.hasLiveKey()).toBe(false);
    expect(modal.keyStatusLabel()).toBe("Add OpenRouter key");
  });

  it("reports live mode once a key is stored", async () => {
    const { modal, store } = await loadModal();
    store.setStoredKey("sk-or-v1-abcdef123456");

    expect(modal.hasLiveKey()).toBe(true);
    expect(modal.keyStatusLabel()).toBe("OpenRouter live");
  });
});

describe("openKeyModal", () => {
  it("reveals the dialog and prefills the stored key", async () => {
    const { modal, store } = await loadModal();
    store.setStoredKey("sk-or-v1-abcdef123456");
    modal.openKeyModal();

    expect(el("key-modal").hidden).toBe(false);
    expect(el<HTMLInputElement>("key-input").value).toBe("sk-or-v1-abcdef123456");
  });

  it("masks the stored key rather than printing it in the label", async () => {
    const { modal, store } = await loadModal();
    store.setStoredKey("sk-or-v1-abcdef123456");
    modal.openKeyModal();

    const label = el("key-current").textContent!;
    expect(label).toBe("Saved in this browser: sk-or-v…3456");
    expect(label).not.toContain("abcdef");
  });

  it("fully masks a short key", async () => {
    const { modal, store } = await loadModal();
    store.setStoredKey("sk-short");
    modal.openKeyModal();

    expect(el("key-current").textContent).toBe("Saved in this browser: ••••••••");
  });

  it("explains scripted mode when nothing is saved", async () => {
    const { modal } = await loadModal();
    modal.openKeyModal();

    expect(el<HTMLInputElement>("key-input").value).toBe("");
    expect(el("key-current").textContent).toMatch(/No key saved/);
  });

  it("is a no-op when the dialog markup is absent", async () => {
    const { modal } = await loadModal();
    document.body.innerHTML = "";

    expect(() => modal.openKeyModal()).not.toThrow();
  });
});

describe("bindKeyModal", () => {
  it("opens the dialog from the header and the briefing", async () => {
    const { modal } = await loadModal();
    modal.bindKeyModal();

    el("key-status").click();
    expect(el("key-modal").hidden).toBe(false);

    modal.closeKeyModal();
    el("briefing-add-key").click();
    expect(el("key-modal").hidden).toBe(false);
  });

  it("saves a trimmed key on submit and reports it", async () => {
    const { modal, store } = await loadModal();
    const onSaved = vi.fn();
    modal.bindKeyModal({ onSaved });

    el<HTMLInputElement>("key-input").value = "  sk-or-v1-fresh  ";
    submitForm();

    expect(store.getStoredKey()).toBe("sk-or-v1-fresh");
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(el("key-modal").hidden).toBe(true);
  });

  it("clears the key when submitted empty", async () => {
    const { modal, store } = await loadModal();
    store.setStoredKey("sk-or-v1-existing");
    modal.bindKeyModal();

    el<HTMLInputElement>("key-input").value = "   ";
    submitForm();

    expect(store.getStoredKey()).toBeNull();
  });

  it("wipes the key and the input on clear", async () => {
    const { modal, store } = await loadModal();
    store.setStoredKey("sk-or-v1-existing");
    const onSaved = vi.fn();
    modal.bindKeyModal({ onSaved });

    el<HTMLInputElement>("key-input").value = "sk-or-v1-existing";
    el("key-clear").click();

    expect(store.getStoredKey()).toBeNull();
    expect(el<HTMLInputElement>("key-input").value).toBe("");
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(el("key-modal").hidden).toBe(true);
  });

  it("closes without saving on cancel", async () => {
    const { modal, store } = await loadModal();
    modal.bindKeyModal();
    modal.openKeyModal();

    el<HTMLInputElement>("key-input").value = "sk-or-v1-discarded";
    el("key-cancel").click();

    expect(el("key-modal").hidden).toBe(true);
    expect(store.getStoredKey()).toBeNull();
  });

  it("closes on a backdrop click but not on a click inside the dialog", async () => {
    const { modal } = await loadModal();
    modal.bindKeyModal();

    modal.openKeyModal();
    el("key-input").click();
    expect(el("key-modal").hidden).toBe(false);

    el("key-modal").click();
    expect(el("key-modal").hidden).toBe(true);
  });

  it("binds its handlers only once", async () => {
    const { modal, store } = await loadModal();
    const onSaved = vi.fn();
    modal.bindKeyModal({ onSaved });
    modal.bindKeyModal({ onSaved });

    el<HTMLInputElement>("key-input").value = "sk-or-v1-once";
    submitForm();

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(store.getStoredKey()).toBe("sk-or-v1-once");
  });
});
