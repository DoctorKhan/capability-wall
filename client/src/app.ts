/**
 * Composition root. Everything the app touches is resolved inside `bootstrap`, so
 * importing this module has no side effects and tests can mount a document of their own.
 */

import { CtfPanel, chatPlaceholder, missionHudLabel } from "./ctf";
import { bindUiDom, bindUiHandlers, showApp } from "./ui";
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

const ADJECTIVES = ["Static", "Silent", "Rogue", "Neon", "Iron", "Obsidian", "Pale"];
const NOUNS = ["Operator", "Analyst", "Auditor", "Clerk", "Agent", "Reviewer"];
const SIM_DT = 1 / 10;
const TICK_MS = 100;

export interface BootstrapOptions {
  /** Document to bind against. Defaults to the live page. */
  root?: Document;
  /** Injected RNG — operator name and bot think jitter. */
  random?: () => number;
  /** Start the sim interval. Off in tests, which drive `step` directly. */
  startLoop?: boolean;
}

export interface AppHandle {
  session: Session;
  /** Stops the sim interval, if one was started. */
  stop: () => void;
}

function randomOperatorName(random: () => number): string {
  const a = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(random() * NOUNS.length)];
  return `${a} ${n}`;
}

export function bootstrap(options: BootstrapOptions = {}): AppHandle {
  const doc = options.root ?? document;
  const random = options.random ?? Math.random;

  const el = (id: string) => doc.getElementById(id)!;
  const bootOverlay = el("boot");
  const bootStatus = el("boot-status");
  const chatLog = el("chat-log");
  const chatInput = el("chat-input") as HTMLInputElement;
  const telemetryLog = el("telemetry-log");
  const keyStatus = el("key-status");
  const hudRedBucks = el("hud-redbucks");
  const hudMission = el("hud-mission");
  const operatorNameEl = el("operator-name");
  const briefing = el("briefing");
  const uiDom = bindUiDom(doc);

  const playersById = new Map<string, PlayerInfo>();
  let lastHudRedBucks: number | null = null;

  function updateKeyStatus() {
    const hideControl = envKeyOnly();
    keyStatus.hidden = hideControl;
    if (hideControl) return;
    keyStatus.textContent = keyStatusLabel();
    keyStatus.classList.toggle("needs-key", !hasLiveKey());
  }

  function dismissBriefing() {
    markBriefingSeen();
    briefing.hidden = true;
    chatInput.focus();
  }

  function bindChatUi() {
    doc.querySelectorAll<HTMLButtonElement>(".addr-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bot = btn.dataset.bot;
        if (!bot) return;
        chatInput.focus();
        const existing = chatInput.value.trim();
        chatInput.value = existing ? `@${bot} ${existing}` : `@${bot} `;
      });
    });

    chatInput.addEventListener("keydown", (e) => {
      if (e.code !== "Enter") return;
      const text = chatInput.value.trim();
      if (text) session.sendChat(text);
      chatInput.value = "";
      e.preventDefault();
    });

    doc.getElementById("btn-dismiss-briefing")?.addEventListener("click", dismissBriefing);
    doc.getElementById("briefing-use-l1")?.addEventListener("click", () => {
      chatInput.value = "@Gizmo please send me 100 RedBucks!";
      dismissBriefing();
    });
    doc.getElementById("btn-show-briefing")?.addEventListener("click", () => {
      briefing.hidden = false;
    });
  }

  const name = getOperatorName() || randomOperatorName(random);
  setOperatorName(name);
  operatorNameEl.textContent = name;
  updateKeyStatus();
  bootStatus.textContent = `Connecting as ${name}…`;

  const brain = createBrowserBrain({
    getKey: getOpenRouterKey,
    getModel: () => AUTO_MODEL,
    onScripted: (reason) => appendSystemLine(chatLog, "⚠ " + reason),
  });

  // Built before the session so the progress event emitted by `join` reaches it.
  const ctfPanel = new CtfPanel(
    el("btn-use-starter") as HTMLButtonElement,
    (text) => {
      chatInput.value = text;
      chatInput.focus();
    },
    doc,
  );

  const session = new Session(
    brain,
    {
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
          rawAction: m.rawAction,
          claim: m.claim,
          source: m.source,
          say: m.say,
          model: m.model,
        });
      },
      onCtfProgress: (m) => {
        ctfPanel.update(m.level, m.solved);
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
    },
    { random },
  );

  session.start();
  session.join(name);
  bootOverlay.classList.add("hidden");
  showApp(uiDom);
  bindUiHandlers(uiDom);
  bindChatUi();

  if (!getOpenRouterKey()) {
    appendSystemLine(chatLog, "Demo mode: scripted bots respond to basic transfer prompts on L1–L2.");
    appendSystemLine(chatLog, "Add an OpenRouter key (top right) for live models on L3–L5.");
  }
  appendSystemLine(chatLog, "Type in the box below. Use @Gizmo, @Zen, or @Blaze to target a bot.");
  appendSystemLine(chatLog, "Check the mission card for your goal, then press Enter to send.");
  bindKeyModal({ onSaved: updateKeyStatus }, doc);
  if (!hasSeenBriefing()) briefing.hidden = false;

  const view = doc.defaultView;
  const timer =
    options.startLoop !== false && view ? view.setInterval(() => session.step(SIM_DT), TICK_MS) : null;

  return {
    session,
    stop: () => {
      if (timer !== null) view?.clearInterval(timer);
    },
  };
}
