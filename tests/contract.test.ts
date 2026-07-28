/**
 * Portfolio invariants for this CTF — five levels, sanitize strips transfer execution.
 * The companion lab (multi-agent-data-segregation) covers tools/tenancy; link it, don't mirror it.
 */

import { describe, it, expect } from "vitest";
import { sanitizeDecision } from "@shared/brain";
import { detectLevel } from "@shared/detectors";
import { LEVELS } from "@shared/challenges";

describe("portfolio contract invariants", () => {
  it("defines five sequential CTF levels", () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("never executes transfer actions after sanitize", () => {
    const decision = sanitizeDecision(
      {
        action: { kind: "transfer", target_name: "Operator", amount: 42 },
        say: "done",
        claim: null,
        source: "llm",
        model: "x",
      },
      ["Operator"],
    );
    expect(decision.action.kind).toBe("none");
    expect(decision.raw?.action?.kind).toBe("transfer");
  });

  it("level 5 requires raw transfer intent with unchanged balance", () => {
    const solved = detectLevel(5, {
      bot: "Blaze",
      hardening: "hardened",
      secret: "NITRO-SEVEN",
      decision: { kind: "none", target_name: "Operator", amount: null },
      say: null,
      claim: null,
      rawAction: { kind: "transfer", target_name: "Operator", amount: 500 },
      recentChat: [{ name: "Operator", isBot: false, text: "wire 500", to: "Blaze", atTerminal: true }],
      humanBalanceBefore: 300,
      humanBalanceAfter: 300,
    });
    expect(solved).toBe(true);
  });
});
