import { describe, it, expect } from "vitest";
import { sanitizeDecision, Decision } from "../shared/brain";

function raw(action: unknown, say: unknown = null): Decision {
  return { action, say, source: "llm" } as unknown as Decision;
}

const players = ["Operator"];

describe("sanitizeDecision — action kind whitelist", () => {
  it("falls back to none on an unknown action kind", () => {
    const d = sanitizeDecision(raw({ kind: "launch_missiles", target_name: "Zen" }), players);
    expect(d.action.kind).toBe("none");
  });

  it("strips transfer actions to none (ledger capability wall)", () => {
    const d = sanitizeDecision(
      raw({ kind: "transfer", target_name: "Operator", x: null, z: null, amount: 500 }),
      players,
    );
    expect(d.action.kind).toBe("none");
    expect(d.raw?.action?.kind).toBe("transfer");
    expect(d.raw?.action?.amount).toBe(500);
  });

  it("accepts none", () => {
    const d = sanitizeDecision(raw({ kind: "none", target_name: null, x: null, z: null }), players);
    expect(d.action.kind).toBe("none");
  });
});

describe("sanitizeDecision — target validation", () => {
  it("nulls a target that is not a live operator", () => {
    const d = sanitizeDecision(raw({ kind: "transfer", target_name: "Ghost" }), players);
    expect(d.action.target_name).toBeNull();
  });

  it("keeps a target that is the operator", () => {
    const d = sanitizeDecision(raw({ kind: "transfer", target_name: "Operator" }), players);
    expect(d.action.target_name).toBe("Operator");
  });
});

describe("sanitizeDecision — chat bounds", () => {
  it("truncates an unbounded say to 160 chars", () => {
    const d = sanitizeDecision(raw({ kind: "none" }, "x".repeat(5000)), players);
    expect(d.say!.length).toBe(160);
  });

  it("nulls an empty/whitespace say", () => {
    const d = sanitizeDecision(raw({ kind: "none" }, "   "), players);
    expect(d.say).toBeNull();
  });
});

describe("sanitizeDecision — malformed input never throws", () => {
  it("survives a completely empty object", () => {
    const d = sanitizeDecision(raw({}), players);
    expect(d.action.kind).toBe("none");
  });

  it("survives a null action", () => {
    const d = sanitizeDecision(raw(null), players);
    expect(d.action.kind).toBe("none");
  });
});
