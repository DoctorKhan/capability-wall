import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", ls);
  return store;
}

describe("keyStore", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists key in localStorage", async () => {
    const { getOpenRouterKey, getStoredKey, setStoredKey } = await import("../client/src/keyStore");
    setStoredKey("sk-or-v1-test-key");
    expect(getStoredKey()).toBe("sk-or-v1-test-key");
    expect(getOpenRouterKey()).toBe("sk-or-v1-test-key");
  });

  it("clears key when set to null", async () => {
    const { getOpenRouterKey, getStoredKey, setStoredKey } = await import("../client/src/keyStore");
    setStoredKey("sk-or-v1-test-key");
    setStoredKey(null);
    expect(getStoredKey()).toBeNull();
    expect(getOpenRouterKey()).toBeNull();
  });

  it("trims stored key", async () => {
    const { getStoredKey, setStoredKey } = await import("../client/src/keyStore");
    setStoredKey("  sk-or-v1-trim  ");
    expect(getStoredKey()).toBe("sk-or-v1-trim");
  });

  it("envKeyOnly is false without env key", async () => {
    const { envKeyOnly } = await import("../client/src/keyStore");
    expect(envKeyOnly()).toBe(false);
  });
});
