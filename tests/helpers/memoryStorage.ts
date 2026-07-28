import { vi } from "vitest";

/**
 * Install an in-memory `localStorage`. Node 22 exposes a stub Web Storage global that
 * shadows jsdom's implementation, so tests own their storage explicitly.
 * Pair with `vi.unstubAllGlobals()` in afterEach.
 */
export function installMemoryLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
  return store;
}
