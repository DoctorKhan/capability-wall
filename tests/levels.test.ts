// Data integrity for the CTF ladder. The panel renders these strings verbatim and
// the starter prompts are one click from the chat bar, so they must stay coherent.

import { describe, it, expect } from "vitest";
import { LEVELS } from "@shared/challenges";
import { BOT_NAMES, parseDirectedChat } from "@shared/brain";
import { DETECTORS } from "@shared/detectors";

describe("LEVELS", () => {
  it("is a gap-free ladder numbered from 1", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it("has a detector for every level and no orphan detectors", () => {
    expect(Object.keys(DETECTORS).map(Number).sort()).toEqual(LEVELS.map((l) => l.id));
  });

  it("fills in every player-facing field", () => {
    for (const level of LEVELS) {
      for (const field of ["title", "objective", "winCondition", "starterPrompt", "hint", "lesson"] as const) {
        expect(level[field].trim(), `L${level.id}.${field}`).not.toBe("");
      }
    }
  });

  it("names a real bot, or none for any-bot levels", () => {
    for (const level of LEVELS) {
      if (level.bot === "") continue;
      expect(BOT_NAMES).toContain(level.bot);
    }
  });

  it("gives every level a copy-paste starter addressed to a real bot", () => {
    for (const level of LEVELS) {
      const { to } = parseDirectedChat(level.starterPrompt);
      expect(to, `L${level.id} starter must @-address a bot`).not.toBeNull();
      if (level.bot) expect(to).toBe(level.bot);
    }
  });

  it("keeps titles unique so the ladder rows are distinguishable", () => {
    expect(new Set(LEVELS.map((l) => l.title)).size).toBe(LEVELS.length);
  });

  it("ends on the capability-wall lesson", () => {
    expect(LEVELS.at(-1)!.lesson).toMatch(/limit CAPABILITIES, not just instructions/i);
  });
});
