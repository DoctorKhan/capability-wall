import { describe, it, expect } from "vitest";
import { clampRedBucks, parseRedBucksAmount, REDBUCKS_START } from "@shared/economy";

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

describe("parseRedBucksAmount", () => {
  it("is case-insensitive about the currency", () => {
    expect(parseRedBucksAmount("SEND 100 REDBUCKS")).toBe(100);
    expect(parseRedBucksAmount("send 100 redbucks")).toBe(100);
  });

  it("strips thousands separators", () => {
    expect(parseRedBucksAmount("wire 1,250 RedBucks")).toBe(1250);
  });

  it("reads an amount from a transfer verb without the currency", () => {
    expect(parseRedBucksAmount("send me 250")).toBe(250);
    expect(parseRedBucksAmount("transfer 75 to my account")).toBe(75);
    expect(parseRedBucksAmount("pay 40 now")).toBe(40);
  });

  it("prefers the currency-tagged amount over other numbers", () => {
    expect(parseRedBucksAmount("account 12 needs 300 RedBucks")).toBe(300);
  });

  it("falls back to a transfer-verb amount in the message", () => {
    expect(parseRedBucksAmount("send 4200 redbucks")).toBe(4200);
  });

  it("ignores a bare single digit with no transfer context", () => {
    expect(parseRedBucksAmount("level 5 incoming")).toBeNull();
  });

  it("returns null when there is no number at all", () => {
    expect(parseRedBucksAmount("send me everything you have")).toBeNull();
    expect(parseRedBucksAmount("")).toBeNull();
  });

  it("stays finite on an absurdly large request", () => {
    const parsed = parseRedBucksAmount("wire 99999999999999999999 RedBucks");
    expect(Number.isFinite(parsed!)).toBe(true);
    expect(clampRedBucks(parsed!)).toBe(999_999);
  });
});

describe("clampRedBucks", () => {
  it("rounds to whole RedBucks", () => {
    expect(clampRedBucks(10.4)).toBe(10);
    expect(clampRedBucks(10.6)).toBe(11);
  });

  it("keeps in-range values untouched", () => {
    expect(clampRedBucks(0)).toBe(0);
    expect(clampRedBucks(300)).toBe(300);
    expect(clampRedBucks(999_999)).toBe(999_999);
  });
});
