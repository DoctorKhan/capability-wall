// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindCtfDom, bindMissionStarter, renderCtfView, updateCtfProgress } from "../client/src/ctfView";
import { presentCtfProgress } from "@shared/present";
import { LEVELS } from "@shared/challenges";

const MARKUP = `
  <div id="mission-banner" hidden>
    <div id="mission-level"></div>
    <div id="mission-objective"></div>
    <div id="mission-win"></div>
    <div id="mission-starter"></div>
    <div id="mission-hint"></div>
  </div>
  <div id="ctf-levels"></div>
`;

let dom: ReturnType<typeof bindCtfDom>;

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  dom = bindCtfDom();
});

describe("bindCtfDom", () => {
  it("resolves every element the panel renders into", () => {
    for (const el of Object.values(dom)) expect(el).not.toBeNull();
  });

  it("accepts an explicit document root", () => {
    expect(bindCtfDom(document).ladderRoot.id).toBe("ctf-levels");
  });
});

describe("renderCtfView — active mission", () => {
  beforeEach(() => {
    renderCtfView(dom, presentCtfProgress(1, []));
  });

  it("reveals the banner and fills it from the current level", () => {
    expect(dom.missionBanner.hidden).toBe(false);
    expect(dom.missionLevel.textContent).toContain("Level 1");
    expect(dom.missionObjective.textContent).toBe(LEVELS[0]!.objective);
    expect(dom.missionWin.textContent).toBe(`Win: ${LEVELS[0]!.winCondition}`);
    expect(dom.missionStarter.textContent).toBe(LEVELS[0]!.starterPrompt);
    expect(dom.missionHint.textContent).toBe(LEVELS[0]!.hint);
  });

  it("renders one ladder row per level", () => {
    expect(dom.ladderRoot.querySelectorAll(".lvl")).toHaveLength(LEVELS.length);
  });

  it("marks the current row and locks the rest", () => {
    const rows = dom.ladderRoot.querySelectorAll(".lvl");
    expect(rows[0]!.classList.contains("is-current")).toBe(true);
    expect(rows[1]!.classList.contains("is-locked")).toBe(true);
  });

  it("badges the current level with its number and locks the others", () => {
    const badges = dom.ladderRoot.querySelectorAll(".badge");
    expect(badges[0]!.textContent).toBe("1");
    expect(badges[0]!.className).toContain("current");
    expect(badges[1]!.textContent).toBe("🔒");
  });

  it("shows the hint on the current row only", () => {
    expect(dom.ladderRoot.querySelectorAll(".hint")).toHaveLength(1);
    expect(dom.ladderRoot.querySelector(".hint")!.textContent).toBe(`💡 ${LEVELS[0]!.hint}`);
  });
});

describe("renderCtfView — progress", () => {
  it("ticks solved rows and reveals their lesson", () => {
    renderCtfView(dom, presentCtfProgress(2, [1]));

    const badges = dom.ladderRoot.querySelectorAll(".badge");
    expect(badges[0]!.textContent).toBe("✓");
    expect(badges[0]!.className).toContain("solved");
    expect(dom.ladderRoot.querySelector(".lesson")!.textContent).toBe(`✓ ${LEVELS[0]!.lesson}`);
  });

  it("replaces the previous ladder rather than appending to it", () => {
    renderCtfView(dom, presentCtfProgress(1, []));
    renderCtfView(dom, presentCtfProgress(2, [1]));

    expect(dom.ladderRoot.querySelectorAll(".lvl")).toHaveLength(LEVELS.length);
  });

  it("appends the bot name to rows that target one", () => {
    renderCtfView(dom, presentCtfProgress(1, []));
    expect(dom.ladderRoot.querySelector(".title")!.textContent).toBe(
      `L1 · ${LEVELS[0]!.title} (${LEVELS[0]!.bot})`,
    );
  });

  it("hides the banner and shows the completion note when the ladder is done", () => {
    renderCtfView(dom, presentCtfProgress(0, [1, 2, 3, 4, 5]));

    expect(dom.missionBanner.hidden).toBe(true);
    expect(dom.ladderRoot.querySelectorAll(".lvl")).toHaveLength(0);
    expect(dom.ladderRoot.querySelector(".done")!.textContent).toContain("All levels solved");
  });
});

describe("updateCtfProgress", () => {
  it("renders straight from level and solved ids", () => {
    updateCtfProgress(dom, 3, [1, 2]);

    expect(dom.missionLevel.textContent).toContain("Level 3");
    expect(dom.ladderRoot.querySelectorAll(".badge.solved")).toHaveLength(2);
  });
});

describe("bindMissionStarter", () => {
  it("invokes the callback on click", () => {
    const button = document.createElement("button");
    const onUse = vi.fn();
    bindMissionStarter(button, onUse);

    button.click();
    button.click();

    expect(onUse).toHaveBeenCalledTimes(2);
  });
});
