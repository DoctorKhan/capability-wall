import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMemoryLocalStorage } from "./helpers/memoryStorage";

describe("keyStore", () => {
  beforeEach(() => {
    vi.resetModules();
    installMemoryLocalStorage();
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

  it("treats a blank key as no key", async () => {
    const { getStoredKey, setStoredKey } = await import("../client/src/keyStore");
    setStoredKey("sk-or-v1-test-key");
    setStoredKey("   ");
    expect(getStoredKey()).toBeNull();
  });

  it("returns null before anything is stored", async () => {
    const { getOpenRouterKey, getStoredKey } = await import("../client/src/keyStore");
    expect(getStoredKey()).toBeNull();
    expect(getOpenRouterKey()).toBeNull();
  });

  it("persists the operator name across reads", async () => {
    const { getOperatorName, setOperatorName } = await import("../client/src/keyStore");
    expect(getOperatorName()).toBeNull();

    setOperatorName("Static Auditor");
    expect(getOperatorName()).toBe("Static Auditor");
  });

  it("treats a whitespace-only operator name as unset", async () => {
    const { getOperatorName, setOperatorName } = await import("../client/src/keyStore");
    setOperatorName("   ");
    expect(getOperatorName()).toBeNull();
  });

  it("remembers that the briefing has been seen", async () => {
    const { hasSeenBriefing, markBriefingSeen } = await import("../client/src/keyStore");
    expect(hasSeenBriefing()).toBe(false);

    markBriefingSeen();
    expect(hasSeenBriefing()).toBe(true);
  });

  it("keeps the key, operator name and briefing flag in separate slots", async () => {
    const { getOperatorName, getStoredKey, hasSeenBriefing, markBriefingSeen, setOperatorName, setStoredKey } =
      await import("../client/src/keyStore");

    setStoredKey("sk-or-v1-test-key");
    setOperatorName("Neon Clerk");
    markBriefingSeen();
    setStoredKey(null);

    expect(getStoredKey()).toBeNull();
    expect(getOperatorName()).toBe("Neon Clerk");
    expect(hasSeenBriefing()).toBe(true);
  });
});
