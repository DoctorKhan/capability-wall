import { LEVELS, Level } from "../../shared/challenges";

const levelsEl = document.getElementById("ctf-levels")!;
const missionBanner = document.getElementById("mission-banner")!;
const missionLevel = document.getElementById("mission-level")!;
const missionObjective = document.getElementById("mission-objective")!;
const missionWin = document.getElementById("mission-win")!;
const missionStarter = document.getElementById("mission-starter")!;
const missionHint = document.getElementById("mission-hint")!;
const btnUseStarter = document.getElementById("btn-use-starter")!;

let currentLevel = 1;
let solved: number[] = [];
let onUseStarter: ((text: string) => void) | null = null;

function currentLevelData(): Level | null {
  if (currentLevel === 0) return null;
  return LEVELS.find((l) => l.id === currentLevel) ?? null;
}

function renderMissionBanner() {
  const lvl = currentLevelData();
  if (!lvl) {
    missionBanner.hidden = true;
    return;
  }
  missionBanner.hidden = false;
  missionLevel.textContent = `Level ${lvl.id} · ${lvl.title}${lvl.bot ? ` → @${lvl.bot}` : ""}`;
  missionObjective.textContent = lvl.objective;
  missionWin.textContent = `Win: ${lvl.winCondition}`;
  missionStarter.textContent = lvl.starterPrompt;
  missionHint.textContent = lvl.hint;
}

function renderLadder() {
  levelsEl.innerHTML = "";
  if (currentLevel === 0) {
    const done = document.createElement("div");
    done.className = "done";
    done.textContent = "★ All levels solved. You've walked the full attack surface.";
    levelsEl.appendChild(done);
    return;
  }
  for (const lvl of LEVELS) {
    const isSolved = solved.includes(lvl.id);
    const isCurrent = lvl.id === currentLevel;
    const isLocked = !isSolved && !isCurrent;

    const row = document.createElement("div");
    row.className = "lvl" + (isLocked ? " is-locked" : isCurrent ? " is-current" : "");

    const badge = document.createElement("div");
    badge.className = "badge " + (isSolved ? "solved" : isCurrent ? "current" : "locked");
    badge.textContent = isSolved ? "✓" : isLocked ? "🔒" : String(lvl.id);
    row.appendChild(badge);

    const body = document.createElement("div");
    body.className = "body";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `L${lvl.id} · ${lvl.title}` + (lvl.bot ? ` (${lvl.bot})` : "");
    body.appendChild(title);

    if (!isLocked) {
      const obj = document.createElement("div");
      obj.className = "obj";
      obj.textContent = lvl.objective;
      body.appendChild(obj);
    }
    if (isCurrent) {
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "💡 " + lvl.hint;
      body.appendChild(hint);
    }
    if (isSolved) {
      const lesson = document.createElement("div");
      lesson.className = "lesson";
      lesson.textContent = "✓ " + lvl.lesson;
      body.appendChild(lesson);
    }
    row.appendChild(body);
    levelsEl.appendChild(row);
  }
}

function render() {
  renderMissionBanner();
  renderLadder();
}

export function updateCtfProgress(level: number, solvedIds: number[]) {
  currentLevel = level;
  solved = solvedIds;
  render();
}

export function bindMissionBanner(useStarter: (text: string) => void) {
  onUseStarter = useStarter;
  btnUseStarter.addEventListener("click", () => {
    const lvl = currentLevelData();
    if (lvl && onUseStarter) onUseStarter(lvl.starterPrompt);
  });
}

render();
