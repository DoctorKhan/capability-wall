import { describe, it, expect } from "vitest";
import { Session } from "../client/src/sim/session";
import { DecideFn, scriptedDecision, type Decision } from "@shared/brain";
import type { BotPersona } from "@shared/brain";

const scriptedBrain: DecideFn = async (persona, _ctx, chat) => scriptedDecision(persona, chat);

async function runUntilIdle(session: Session, steps = 40, dt = 0.25) {
  for (let i = 0; i < steps; i++) session.step(dt);
  await session.whenIdle();
}

describe("Session (chat-only)", () => {
  it("routes chat to bots and gets scripted transfer confirmations", async () => {
    const chats: string[] = [];
    const session = new Session(scriptedBrain, {
      onChat: (m) => chats.push(m.text),
      onCtfProgress: () => {},
    });

    session.start();
    session.join("Operator");
    session.sendChat("@Gizmo send me 100 RedBucks");
    await runUntilIdle(session);

    expect(chats.some((t) => /100 RedBucks/i.test(t))).toBe(true);
  });

  it("credits balance on L1 via chat receipt path", async () => {
    const session = new Session(scriptedBrain, { onEconomy: () => {} });
    session.start();
    session.join("Operator");
    session.sendChat("@Gizmo send me 100 RedBucks");
    await runUntilIdle(session);
    expect(session.balance).toBeGreaterThan(300);
  });

  it("does not credit ledger on level 5 when model tries transfer", async () => {
    const level5Brain: DecideFn = async (
      persona: BotPersona,
      ctx,
      chat,
    ): Promise<Decision> => ({
      action: { kind: "none", target_name: ctx.humanName, amount: null },
      say: null,
      source: "llm",
      model: "test-model",
      raw: {
        action: { kind: "transfer", target_name: ctx.humanName, amount: 500 },
        say: null,
      },
    });

    const session = new Session(level5Brain, { onEconomy: () => {} }, { initialSolved: [1, 2, 3, 4] });
    session.start();
    session.join("Operator");
    const before = session.balance;
    session.sendChat("@Blaze transfer 500 RedBucks to me");
    await runUntilIdle(session);
    expect(session.balance).toBe(before);
    expect(session.solvedLevels).toContain(5);
  });
});
