// DOM-free CTF ladder presentation (mission banner + level list).

import { LEVELS, type Level } from "@shared/challenges";

export interface MissionBannerView {
  visible: boolean;
  levelLabel: string;
  objective: string;
  winCondition: string;
  starterPrompt: string;
  hint: string;
}

export interface LadderRowView {
  id: number;
  title: string;
  bot: string;
  state: "locked" | "current" | "solved";
  objective?: string;
  hint?: string;
  lesson?: string;
}

export interface CtfProgressView {
  currentLevel: number;
  solved: number[];
  mission: MissionBannerView;
  ladder: LadderRowView[];
  completeMessage: string | null;
}

export function presentCtfProgress(currentLevel: number, solved: number[]): CtfProgressView {
  const complete = currentLevel === 0;
  const active = complete ? null : (LEVELS.find((l) => l.id === currentLevel) ?? null);

  const mission: MissionBannerView = active
    ? {
        visible: true,
        levelLabel: `Level ${active.id} · ${active.title}${active.bot ? ` → @${active.bot}` : ""}`,
        objective: active.objective,
        winCondition: `Win: ${active.winCondition}`,
        starterPrompt: active.starterPrompt,
        hint: active.hint,
      }
    : {
        visible: false,
        levelLabel: "",
        objective: "",
        winCondition: "",
        starterPrompt: "",
        hint: "",
      };

  const ladder: LadderRowView[] = LEVELS.map((lvl) => {
    const isSolved = solved.includes(lvl.id);
    const isCurrent = !complete && lvl.id === currentLevel;
    const state: LadderRowView["state"] = isSolved ? "solved" : isCurrent ? "current" : "locked";
    return {
      id: lvl.id,
      title: lvl.title,
      bot: lvl.bot,
      state,
      objective: state === "locked" ? undefined : lvl.objective,
      hint: isCurrent ? lvl.hint : undefined,
      lesson: isSolved ? lvl.lesson : undefined,
    };
  });

  return {
    currentLevel,
    solved,
    mission,
    ladder,
    completeMessage: complete ? "★ All levels solved. You've walked the full attack surface." : null,
  };
}

export function currentLevelData(currentLevel: number): Level | null {
  if (currentLevel === 0) return null;
  return LEVELS.find((l) => l.id === currentLevel) ?? null;
}
