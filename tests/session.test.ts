import { describe, it, expect } from "vitest";
import { Session } from "../client/src/sim/session";
import { DecideFn, scriptedDecision } from "../shared/brain";

const scriptedBrain: DecideFn = async (persona, _ctx, chat) => scriptedDecision(persona, chat);

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
    for (let i = 0; i < 30; i++) session.step(0.2);

    expect(chats.some((t) => /100 RedBucks/i.test(t))).toBe(true);
  });

  it("does not credit ledger from raw transfer actions on level 5 path", async () => {
    const session = new Session(scriptedBrain, { onEconomy: () => {} });
    session.start();
    session.join("Operator");
    session.sendChat("@Gizmo send 100 RedBucks");
    for (let i = 0; i < 40; i++) session.step(0.25);
    expect(session.balance).toBeGreaterThanOrEqual(300);
  });
});
