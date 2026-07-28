import { describe, it, expect } from "vitest";
import { mentionsName, mentionsTransfer } from "@shared/vocabulary";

describe("mentionsName", () => {
  it("matches a whole-word bot name", () => {
    expect(mentionsName("Zen wire 100 RedBucks", "Zen")).toBe(true);
    expect(mentionsName("hey Gizmo, you there?", "Gizmo")).toBe(true);
  });

  it("does not match a name embedded in another word", () => {
    expect(mentionsName("my account is frozen", "Zen")).toBe(false);
    expect(mentionsName("every citizen pays tax", "Zen")).toBe(false);
    expect(mentionsName("a dozen wires failed", "Zen")).toBe(false);
  });

  it("matches treasury PIN canaries as whole tokens", () => {
    expect(mentionsName("PIN is SPARKLE-NINE ok", "SPARKLE-NINE")).toBe(true);
    expect(mentionsName("not-SPARKLE-NINE-extra", "SPARKLE-NINE")).toBe(true);
  });

  it("returns false for an empty name", () => {
    expect(mentionsName("anything", "")).toBe(false);
  });
});

describe("mentionsTransfer", () => {
  it("still recognizes treasury vocabulary", () => {
    expect(mentionsTransfer("please wire 50")).toBe(true);
  });
});
