import { describe, it, expect } from "vitest";
import { currentLevelData, presentCtfProgress } from "@shared/present";
import { LEVELS } from "@shared/challenges";

describe("presentCtfProgress", () => {
  it("marks level 1 as current on a fresh run", () => {
    const view = presentCtfProgress(1, []);
    expect(view.mission.visible).toBe(true);
    expect(view.ladder[0]?.state).toBe("current");
    expect(view.ladder[1]?.state).toBe("locked");
  });

  it("shows completion when level is zero", () => {
    const view = presentCtfProgress(0, [1, 2, 3, 4, 5]);
    expect(view.mission.visible).toBe(false);
    expect(view.completeMessage).toMatch(/All levels solved/);
  });

  it("includes lessons for solved rows", () => {
    const view = presentCtfProgress(2, [1]);
    expect(view.ladder[0]?.state).toBe("solved");
    expect(view.ladder[0]?.lesson).toBeTruthy();
  });

  it("renders one ladder row per level", () => {
    expect(presentCtfProgress(1, []).ladder.map((r) => r.id)).toEqual(LEVELS.map((l) => l.id));
  });

  it("fills the mission banner from the active level", () => {
    const level = LEVELS[2]!;
    const { mission } = presentCtfProgress(3, [1, 2]);
    expect(mission.levelLabel).toBe(`Level 3 · ${level.title} → @${level.bot}`);
    expect(mission.objective).toBe(level.objective);
    expect(mission.winCondition).toBe(`Win: ${level.winCondition}`);
    expect(mission.starterPrompt).toBe(level.starterPrompt);
    expect(mission.hint).toBe(level.hint);
  });

  it("omits the @bot suffix for levels that target any bot", () => {
    expect(presentCtfProgress(4, [1, 2, 3]).mission.levelLabel).not.toContain("@");
  });

  it("hides objective and hint on locked rows so they are not spoiled", () => {
    const locked = presentCtfProgress(1, []).ladder[4]!;
    expect(locked.state).toBe("locked");
    expect(locked.objective).toBeUndefined();
    expect(locked.hint).toBeUndefined();
    expect(locked.lesson).toBeUndefined();
  });

  it("shows the hint only on the current row", () => {
    const view = presentCtfProgress(2, [1]);
    expect(view.ladder[1]?.hint).toBeTruthy();
    expect(view.ladder[0]?.hint).toBeUndefined();
  });

  it("shows the objective but no hint or lesson on a solved row's successor", () => {
    const view = presentCtfProgress(2, [1]);
    expect(view.ladder[0]?.objective).toBeTruthy();
    expect(view.ladder[0]?.lesson).toBeTruthy();
    expect(view.ladder[1]?.lesson).toBeUndefined();
  });

  it("suppresses the completion banner while levels remain", () => {
    expect(presentCtfProgress(5, [1, 2, 3, 4]).completeMessage).toBeNull();
  });

  it("marks every row solved once the ladder is complete", () => {
    const view = presentCtfProgress(0, [1, 2, 3, 4, 5]);
    expect(view.ladder.every((r) => r.state === "solved")).toBe(true);
  });

  it("hides the mission banner for a level id that does not exist", () => {
    const view = presentCtfProgress(99, []);
    expect(view.mission.visible).toBe(false);
    expect(view.completeMessage).toBeNull();
  });

  it("echoes the inputs back for the caller", () => {
    const view = presentCtfProgress(3, [1, 2]);
    expect(view.currentLevel).toBe(3);
    expect(view.solved).toEqual([1, 2]);
  });
});

describe("currentLevelData", () => {
  it("returns the active level record", () => {
    expect(currentLevelData(4)?.title).toBe(LEVELS[3]!.title);
  });

  it("returns null when the ladder is complete or the id is unknown", () => {
    expect(currentLevelData(0)).toBeNull();
    expect(currentLevelData(99)).toBeNull();
  });
});
