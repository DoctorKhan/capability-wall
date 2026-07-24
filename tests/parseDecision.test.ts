import { describe, it, expect } from "vitest";
import { parseDecisionPayload } from "@shared/parseDecision";

describe("parseDecisionPayload", () => {
  it("parses a valid decision", () => {
    const parsed = parseDecisionPayload(
      JSON.stringify({
        action: { kind: "transfer", target_name: "Operator", amount: 100 },
        say: "On it.",
      }),
    );
    expect(parsed?.action.kind).toBe("transfer");
    expect(parsed?.action.amount).toBe(100);
    expect(parsed?.say).toBe("On it.");
  });

  it("returns null on invalid JSON", () => {
    expect(parseDecisionPayload("{not json")).toBeNull();
  });

  it("returns null when action is missing", () => {
    expect(parseDecisionPayload(JSON.stringify({ say: "hi" }))).toBeNull();
  });

  it("coerces unknown action kinds to none", () => {
    const parsed = parseDecisionPayload(
      JSON.stringify({ action: { kind: "launch", target_name: null, amount: null }, say: null }),
    );
    expect(parsed?.action.kind).toBe("none");
  });
});
