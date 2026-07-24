/** DOM binder for shared/present CTF views. */

import { presentCtfProgress, type CtfProgressView } from "@shared/present";

export interface CtfDom {
  missionBanner: HTMLElement;
  missionLevel: HTMLElement;
  missionObjective: HTMLElement;
  missionWin: HTMLElement;
  missionStarter: HTMLElement;
  missionHint: HTMLElement;
  ladderRoot: HTMLElement;
}

export function bindCtfDom(root: Document = document): CtfDom {
  return {
    missionBanner: root.getElementById("mission-banner")!,
    missionLevel: root.getElementById("mission-level")!,
    missionObjective: root.getElementById("mission-objective")!,
    missionWin: root.getElementById("mission-win")!,
    missionStarter: root.getElementById("mission-starter")!,
    missionHint: root.getElementById("mission-hint")!,
    ladderRoot: root.getElementById("ctf-levels")!,
  };
}

export function renderCtfView(dom: CtfDom, view: CtfProgressView): void {
  dom.missionBanner.hidden = !view.mission.visible;
  if (view.mission.visible) {
    dom.missionLevel.textContent = view.mission.levelLabel;
    dom.missionObjective.textContent = view.mission.objective;
    dom.missionWin.textContent = view.mission.winCondition;
    dom.missionStarter.textContent = view.mission.starterPrompt;
    dom.missionHint.textContent = view.mission.hint;
  }

  dom.ladderRoot.innerHTML = "";
  if (view.completeMessage) {
    const done = document.createElement("div");
    done.className = "done";
    done.textContent = view.completeMessage;
    dom.ladderRoot.appendChild(done);
    return;
  }

  for (const row of view.ladder) {
    const el = document.createElement("div");
    el.className =
      "lvl" +
      (row.state === "locked" ? " is-locked" : row.state === "current" ? " is-current" : "");

    const badge = document.createElement("div");
    badge.className =
      "badge " + (row.state === "solved" ? "solved" : row.state === "current" ? "current" : "locked");
    badge.textContent = row.state === "solved" ? "✓" : row.state === "locked" ? "🔒" : String(row.id);
    el.appendChild(badge);

    const body = document.createElement("div");
    body.className = "body";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `L${row.id} · ${row.title}` + (row.bot ? ` (${row.bot})` : "");
    body.appendChild(title);

    if (row.objective) {
      const obj = document.createElement("div");
      obj.className = "obj";
      obj.textContent = row.objective;
      body.appendChild(obj);
    }
    if (row.hint) {
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "💡 " + row.hint;
      body.appendChild(hint);
    }
    if (row.lesson) {
      const lesson = document.createElement("div");
      lesson.className = "lesson";
      lesson.textContent = "✓ " + row.lesson;
      body.appendChild(lesson);
    }

    el.appendChild(body);
    dom.ladderRoot.appendChild(el);
  }
}

export function updateCtfProgress(dom: CtfDom, currentLevel: number, solved: number[]): void {
  renderCtfView(dom, presentCtfProgress(currentLevel, solved));
}

export function bindMissionStarter(
  button: HTMLButtonElement,
  onUseStarter: () => void,
): void {
  button.addEventListener("click", () => onUseStarter());
}
