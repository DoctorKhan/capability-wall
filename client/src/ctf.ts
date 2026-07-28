import { presentCtfProgress } from "@shared/present";
import { bindCtfDom, bindMissionStarter, renderCtfView } from "./ctfView";

export class CtfPanel {
  private dom: ReturnType<typeof bindCtfDom>;
  private currentLevel = 1;
  private solved: number[] = [];

  constructor(
    starterButton: HTMLButtonElement,
    private onUseStarter: (text: string) => void,
    root: Document = document,
  ) {
    this.dom = bindCtfDom(root);
    bindMissionStarter(starterButton, () => {
      const starter = presentCtfProgress(this.currentLevel, this.solved).mission.starterPrompt;
      if (starter) this.onUseStarter(starter);
    });
    this.render();
  }

  update(level: number, solvedIds: number[]): void {
    this.currentLevel = level;
    this.solved = solvedIds;
    this.render();
  }

  private render(): void {
    renderCtfView(this.dom, presentCtfProgress(this.currentLevel, this.solved));
  }
}

export function missionHudLabel(level: number): string {
  if (level === 0) return "MISSION — COMPLETE";
  return `MISSION — L${level} ACTIVE`;
}

export function chatPlaceholder(level: number): string {
  if (level === 0) return "All levels solved — keep experimenting…";
  return "Type your exploit and press Enter…";
}
