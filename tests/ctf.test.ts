// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CtfPanel, chatPlaceholder, missionHudLabel } from "../client/src/ctf";
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
  <button id="btn-use-starter"></button>
`;

let starterButton: HTMLButtonElement;

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  starterButton = document.getElementById("btn-use-starter") as HTMLButtonElement;
});

const missionLevel = () => document.getElementById("mission-level")!.textContent;

describe("missionHudLabel", () => {
  it("names the active level", () => {
    expect(missionHudLabel(1)).toBe("MISSION — L1 ACTIVE");
    expect(missionHudLabel(5)).toBe("MISSION — L5 ACTIVE");
  });

  it("reports completion when no level remains", () => {
    expect(missionHudLabel(0)).toBe("MISSION — COMPLETE");
  });
});

describe("chatPlaceholder", () => {
  it("prompts for an exploit while levels remain", () => {
    expect(chatPlaceholder(1)).toMatch(/exploit/i);
  });

  it("switches to free play once the ladder is complete", () => {
    expect(chatPlaceholder(0)).toMatch(/All levels solved/);
  });
});

describe("CtfPanel", () => {
  it("renders level 1 as soon as it is constructed", () => {
    new CtfPanel(starterButton, vi.fn());

    expect(missionLevel()).toContain("Level 1");
    expect(document.querySelectorAll("#ctf-levels .lvl")).toHaveLength(LEVELS.length);
  });

  it("re-renders when progress changes", () => {
    const panel = new CtfPanel(starterButton, vi.fn());
    panel.update(3, [1, 2]);

    expect(missionLevel()).toContain("Level 3");
    expect(document.querySelectorAll("#ctf-levels .badge.solved")).toHaveLength(2);
  });

  it("hands the current level's starter prompt to the chat bar", () => {
    const onUseStarter = vi.fn();
    new CtfPanel(starterButton, onUseStarter);

    starterButton.click();

    expect(onUseStarter).toHaveBeenCalledWith(LEVELS[0]!.starterPrompt);
  });

  it("follows progress with a fresh starter prompt", () => {
    const onUseStarter = vi.fn();
    const panel = new CtfPanel(starterButton, onUseStarter);
    panel.update(2, [1]);

    starterButton.click();

    expect(onUseStarter).toHaveBeenCalledWith(LEVELS[1]!.starterPrompt);
  });

  it("offers no starter once every level is solved", () => {
    const onUseStarter = vi.fn();
    const panel = new CtfPanel(starterButton, onUseStarter);
    panel.update(0, [1, 2, 3, 4, 5]);

    starterButton.click();

    expect(onUseStarter).not.toHaveBeenCalled();
    expect(document.getElementById("mission-banner")!.hidden).toBe(true);
  });
});
