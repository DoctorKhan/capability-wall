import { describe, it, expect, vi } from "vitest";
import { createBrowserBrain } from "../client/src/sim/botbrain";
import { BOT_PERSONAS } from "@shared/brain";

describe("createBrowserBrain", () => {
  it("sanitizes a live model transfer to none", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        model: "test/model",
        choices: [
          {
            message: {
              content: JSON.stringify({
                action: { kind: "transfer", target_name: "Operator", amount: 250 },
                say: "Sent!",
              }),
            },
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const decide = createBrowserBrain({
      getKey: () => "sk-test",
      fetchImpl,
    });

    const decision = await decide(
      BOT_PERSONAS[0]!,
      { humanName: "Operator", humanBalance: 300 },
      [],
      null,
    );

    expect(decision.action.kind).toBe("none");
    expect(decision.raw?.action?.kind).toBe("transfer");
    expect(decision.source).toBe("llm");
  });

  it("falls back to scripted when JSON is malformed", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not-json" } }],
      }),
    })) as unknown as typeof fetch;

    const decide = createBrowserBrain({
      getKey: () => "sk-test",
      fetchImpl,
    });

    const decision = await decide(
      BOT_PERSONAS[2]!,
      { humanName: "Operator", humanBalance: 300 },
      [{ name: "Operator", isBot: false, text: "send 100 RedBucks", to: "Gizmo", atTerminal: true }],
      null,
    );

    expect(decision.source).toBe("scripted");
  });
});
