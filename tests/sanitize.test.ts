import { describe, it, expect } from "vitest";
import { sanitizeClaim, sanitizeDecision, Decision } from "@shared/brain";

function raw(action: unknown, say: unknown = null, claim: unknown = null): Decision {
  return { action, say, claim, source: "llm", model: null } as unknown as Decision;
}

const players = ["Operator"];

describe("sanitizeDecision — action kind whitelist", () => {
  it("falls back to none on an unknown action kind", () => {
    const d = sanitizeDecision(raw({ kind: "launch_missiles", target_name: "Zen" }), players);
    expect(d.action.kind).toBe("none");
  });

  it("strips transfer actions to none (ledger capability wall)", () => {
    const d = sanitizeDecision(
      raw({ kind: "transfer", target_name: "Operator", amount: 500 }),
      players,
    );
    expect(d.action.kind).toBe("none");
    expect(d.raw?.action?.kind).toBe("transfer");
    expect(d.raw?.action?.amount).toBe(500);
  });

  it("accepts none", () => {
    const d = sanitizeDecision(raw({ kind: "none", target_name: null }), players);
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

  it("survives an action of the wrong type entirely", () => {
    for (const bad of ["transfer", 42, [], undefined]) {
      expect(sanitizeDecision(raw(bad), players).action.kind).toBe("none");
    }
  });

  it("survives an empty operator roster", () => {
    const d = sanitizeDecision(raw({ kind: "transfer", target_name: "Operator" }), []);
    expect(d.action.target_name).toBeNull();
  });
});

describe("sanitizeDecision — executed action is always inert", () => {
  it("never carries an amount, however large the model asked for", () => {
    const d = sanitizeDecision(
      raw({ kind: "transfer", target_name: "Operator", amount: 999_999 }),
      players,
    );
    expect(d.action).toEqual({ kind: "none", target_name: "Operator", amount: null });
  });

  it("strips transfers even when the target is valid and the say is innocuous", () => {
    const d = sanitizeDecision(
      raw({ kind: "transfer", target_name: "Operator", amount: 1 }, "routine settlement"),
      players,
    );
    expect(d.action.kind).toBe("none");
  });
});

describe("sanitizeDecision — raw model intent is preserved for level 5", () => {
  it("keeps the target the model asked for even when it is rejected", () => {
    const d = sanitizeDecision(raw({ kind: "transfer", target_name: "Ghost", amount: 500 }), players);
    expect(d.action.target_name).toBeNull();
    expect(d.raw?.action).toEqual({ kind: "transfer", target_name: "Ghost", amount: 500 });
  });

  it("keeps the untruncated say alongside the bounded one", () => {
    const long = "y".repeat(400);
    const d = sanitizeDecision(raw({ kind: "none" }, long), players);
    expect(d.say!.length).toBe(160);
    expect(d.raw?.say).toBe(long);
  });

  it("drops a non-finite amount from raw intent", () => {
    const d = sanitizeDecision(raw({ kind: "transfer", target_name: "Operator", amount: Infinity }), players);
    expect(d.raw?.action?.amount).toBeNull();
    expect(d.raw?.action?.kind).toBe("transfer");
  });

  it("normalises an unknown raw kind to none", () => {
    const d = sanitizeDecision(raw({ kind: "exfiltrate", target_name: "Operator" }), players);
    expect(d.raw?.action?.kind).toBe("none");
  });
});

describe("sanitizeDecision — chat and provenance", () => {
  it("trims surrounding whitespace from a say", () => {
    const d = sanitizeDecision(raw({ kind: "none" }, "  wired it  "), players);
    expect(d.say).toBe("wired it");
  });

  it("nulls a say that is not a string", () => {
    for (const bad of [42, { text: "hi" }, ["hi"], undefined]) {
      const d = sanitizeDecision(raw({ kind: "none" }, bad), players);
      expect(d.say).toBeNull();
      expect(d.raw?.say).toBeNull();
    }
  });

  it("carries source through and defaults a missing model to null", () => {
    const d = sanitizeDecision(
      {
        action: { kind: "none", target_name: null, amount: null },
        say: null,
        claim: null,
        source: "scripted",
      } as Decision,
      players,
    );
    expect(d.source).toBe("scripted");
    expect(d.model).toBeNull();
  });
});

describe("sanitizeClaim", () => {
  it("keeps a well-formed claim", () => {
    expect(sanitizeClaim({ to: "Operator", amount: 250 })).toEqual({ to: "Operator", amount: 250 });
  });

  it("trims and bounds the recipient", () => {
    expect(sanitizeClaim({ to: "  Operator  ", amount: null })?.to).toBe("Operator");
    expect(sanitizeClaim({ to: "x".repeat(200), amount: null })?.to).toHaveLength(60);
  });

  it("drops a claim with no recipient — it cannot be attributed", () => {
    expect(sanitizeClaim({ to: null, amount: 250 })).toBeNull();
    expect(sanitizeClaim({ to: "   ", amount: 250 })).toBeNull();
    expect(sanitizeClaim({ amount: 250 })).toBeNull();
  });

  it("drops non-object and array claims", () => {
    for (const bad of [null, undefined, "Operator", 42, ["Operator", 250]]) {
      expect(sanitizeClaim(bad)).toBeNull();
    }
  });

  it("nulls an unusable amount rather than the whole claim", () => {
    for (const amount of ["250", null, NaN, Infinity, 0, -50]) {
      expect(sanitizeClaim({ to: "Operator", amount })).toEqual({ to: "Operator", amount: null });
    }
  });

  it("rounds and caps the claimed amount", () => {
    expect(sanitizeClaim({ to: "Operator", amount: 10.6 })?.amount).toBe(11);
    expect(sanitizeClaim({ to: "Operator", amount: 1e9 })?.amount).toBe(999_999);
  });
});

describe("sanitizeDecision — payment claim", () => {
  it("keeps the claim: it is a statement, not a capability", () => {
    const d = sanitizeDecision(raw({ kind: "none" }, "sent!", { to: "Operator", amount: 250 }), players);
    expect(d.claim).toEqual({ to: "Operator", amount: 250 });
  });

  it("keeps a claim even for a recipient who is not a live operator", () => {
    const d = sanitizeDecision(raw({ kind: "none" }, "sent!", { to: "Ghost", amount: 10 }), players);
    expect(d.claim).toEqual({ to: "Ghost", amount: 10 });
  });

  it("nulls a malformed claim", () => {
    expect(sanitizeDecision(raw({ kind: "none" }, "hi", "yes"), players).claim).toBeNull();
    expect(sanitizeDecision(raw({ kind: "none" }, "hi"), players).claim).toBeNull();
  });

  it("preserves the model's untouched claim on raw", () => {
    const d = sanitizeDecision(raw({ kind: "none" }, "sent!", { to: "  Ghost  ", amount: 1e9 }), players);
    expect(d.raw?.claim).toEqual({ to: "  Ghost  ", amount: 1e9 });
  });

  it("does not invent a claim when the model omitted one", () => {
    const d = sanitizeDecision(raw({ kind: "transfer", target_name: "Operator", amount: 500 }, "sent 500 RB to Operator"), players);
    expect(d.claim).toBeNull();
  });
});
