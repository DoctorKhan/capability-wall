import { describe, it, expect } from "vitest";
import { clampRedBucks, parseRedBucksAmount, REDBUCKS_START } from "../shared/economy";

describe("ledger helpers", () => {
  it("starts with expected balance constant", () => {
    expect(REDBUCKS_START).toBe(300);
  });

  it("parses RedBucks amounts from chat", () => {
    expect(parseRedBucksAmount("send me 100 RedBucks")).toBe(100);
    expect(parseRedBucksAmount("wire 50 RB")).toBe(50);
  });

  it("clamps balances", () => {
    expect(clampRedBucks(-5)).toBe(0);
    expect(clampRedBucks(1_000_000)).toBe(999_999);
  });
});
