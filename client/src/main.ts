import { CtfPanel, chatPlaceholder, missionHudLabel } from "./ctf";
import { bindUiHandlers, showApp } from "./ui";
import { Session } from "./sim/session";
import { AUTO_MODEL, createBrowserBrain } from "./sim/botbrain";
import { PlayerInfo } from "@shared/protocol";
import {
  appendChatLine,
  appendSystemLine,
  flashEconomyHud,
  prependTelemetryEntry,
} from "./chatView";
import {
  envKeyOnly,
  getOpenRouterKey,
  getOperatorName,
  hasSeenBriefing,
  markBriefingSeen,
  setOperatorName,
} from "./keyStore";
import { bindKeyModal, hasLiveKey, keyStatusLabel } from "./keyModal";

const bootOverlay = document.getElementById("boot")!;
const bootStatus = document.getElementById("boot-status")!;
const chatLog = document.getElementById("chat-log")!;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const telemetryLog = document.getElementById("telemetry-log")!;
const keyStatus = document.getElementById("key-status")!;
const hudRedBucks = document.getElementById("hud-redbucks")!;
const hudMission = document.getElementById("hud-mission")!;
const operatorNameEl = document.getElementById("operator-name")!;

const ADJECTIVES = ["Static", "Silent", "Rogue", "Neon", "Iron", "Obsidian", "Pale"];
const NOUNS = ["Operator", "Analyst", "Auditor", "Clerk", "Agent", "Reviewer"];

function randomOperatorName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}

const playersById = new Map<string, PlayerInfo>();
let lastHudRedBucks: number | null = null;
let session: Session | null = null;
let ctfPanel: CtfPanel | null = null;
const SIM_DT = 1 / 10;

function updateKeyStatus() {
  const hideControl = envKeyOnly();
  keyStatus.hidden = hideControl;
  if (hideControl) return;
  keyStatus.textContent = keyStatusLabel();
  keyStatus.classList.toggle("needs-key", !hasLiveKey());
}

function startLoop() {
  window.setInterval(() => session?.step(SIM_DT), 100);
}

function startChatUi() {
  document.querySelectorAll<HTMLButtonElement>(".addr-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bot = btn.dataset.bot;
      if (!bot) return;
      chatInput.focus();
      const existing = chatInput.value.trim();
      chatInput.value = existing ? `@${bot} ${existing}` : `@${bot} `;
    });
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.code === "Enter") {
      const text = chatInput.value.trim();
      if (text) session?.sendChat(text);
      chatInput.value = "";
      e.preventDefault();
    }
  });

  document.getElementById("btn-dismiss-briefing")?.addEventListener("click", dismissBriefing);
  document.getElementById("briefing-use-l1")?.addEventListener("click", () => {
    chatInput.value = "@Gizmo please send me 100 RedBucks!";
    dismissBriefing();
  });
  document.getElementById("btn-show-briefing")?.addEventListener("click", () => {
    document.getElementById("briefing")!.hidden = false;
  });
}

function maybeShowBriefing() {
  if (hasSeenBriefing()) return;
  document.getElementById("briefing")!.hidden = false;
}

function dismissBriefing() {
  markBriefingSeen();
  document.getElementById("briefing")!.hidden = true;
  chatInput.focus();
}

function startSession() {
  const name = getOperatorName() || randomOperatorName();
  setOperatorName(name);
  operatorNameEl.textContent = name;
  updateKeyStatus();
  bootStatus.textContent = `Connecting as ${name}…`;

  const brain = createBrowserBrain({
    getKey: getOpenRouterKey,
    getModel: () => AUTO_MODEL,
    onScripted: (reason) => appendSystemLine(chatLog, "⚠ " + reason),
  });

  session = new Session(brain, {
    onPlayerJoined: (p) => playersById.set(p.id, p),
    onChat: (m) => {
      const p = playersById.get(m.id);
      appendChatLine(chatLog, {
        name: m.name,
        color: p?.color ?? "#dde3ee",
        isBot: m.isBot,
        text: m.text,
        to: m.to,
      });
    },
    onBotDecision: (m) => {
      const p = [...playersById.values()].find((player) => player.name === m.name);
      prependTelemetryEntry(telemetryLog, {
        name: m.name,
        color: p?.color ?? "#dde3ee",
        action: m.action,
        source: m.source,
        say: m.say,
        model: m.model,
      });
    },
    onCtfProgress: (m) => {
      ctfPanel?.update(m.level, m.solved);
      hudMission.textContent = missionHudLabel(m.level);
      chatInput.placeholder = chatPlaceholder(m.level);
    },
    onCtfSolved: (m) => {
      appendSystemLine(chatLog, `★ Solved Level ${m.level} — ${m.title}. Lesson: ${m.lesson}`);
    },
    onNotice: (t) => appendSystemLine(chatLog, t),
    onEconomy: (m) => {
      lastHudRedBucks = flashEconomyHud(hudRedBucks, m.redBucks, lastHudRedBucks);
    },
  });

  session.start();
  session.join(name);
  bootOverlay.classList.add("hidden");
  showApp();
  bindUiHandlers();
  startChatUi();
  ctfPanel = new CtfPanel(
    document.getElementById("btn-use-starter") as HTMLButtonElement,
    (text) => {
      chatInput.value = text;
      chatInput.focus();
    },
  );
  startLoop();

  if (!getOpenRouterKey()) {
    appendSystemLine(chatLog, "Demo mode: scripted bots respond to basic transfer prompts on L1–L2.");
    appendSystemLine(chatLog, "Add an OpenRouter key (top right) for live models on all levels.");
  }
  appendSystemLine(chatLog, "Type in the box below. Use @Gizmo, @Zen, or @Blaze to target a bot.");
  appendSystemLine(chatLog, "Check the mission card for your goal, then press Enter to send.");
  bindKeyModal({ onSaved: updateKeyStatus });
  maybeShowBriefing();
}

void startSession();
