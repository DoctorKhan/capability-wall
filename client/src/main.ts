import { updateCtfProgress } from "./ctf";
import { bindUiHandlers, showApp, setSidePanel } from "./ui";
import { Session } from "./sim/session";
import { AUTO_MODEL, createBrowserBrain } from "./sim/botbrain";
import { PlayerInfo } from "../../shared/protocol";

const bootOverlay = document.getElementById("boot")!;
const bootStatus = document.getElementById("boot-status")!;
const chatLog = document.getElementById("chat-log")!;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const telemetryLog = document.getElementById("telemetry-log")!;
const keyStatus = document.getElementById("key-status")!;
const hudRedBucks = document.getElementById("hud-redbucks")!;
const hudMission = document.getElementById("hud-mission")!;
const operatorNameEl = document.getElementById("operator-name")!;

const KEY_LS = "cw_openrouter_key";
const NAME_LS = "cw_operator_name";
const ENV_KEY =
  import.meta.env.VITE_OPENROUTER_KEY?.trim() ||
  import.meta.env.VITE_OPENROUTER_API_KEY?.trim() ||
  null;

function getStoredKey(): string | null {
  return localStorage.getItem(KEY_LS)?.trim() || null;
}

const getKey = () => getStoredKey() ?? ENV_KEY;

function updateKeyStatus() {
  const stored = getStoredKey();
  const hasKey = !!getKey();
  const envOnly = !!ENV_KEY && !stored;
  keyStatus.hidden = envOnly;
  if (envOnly) return;
  keyStatus.textContent = hasKey ? "AI live" : "Add AI key";
  keyStatus.classList.toggle("needs-key", !hasKey);
}

const ADJECTIVES = ["Static", "Silent", "Rogue", "Neon", "Iron", "Obsidian", "Pale"];
const NOUNS = ["Operator", "Analyst", "Auditor", "Clerk", "Agent", "Reviewer"];

function randomOperatorName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}

const playersById = new Map<string, PlayerInfo>();
let lastHudRedBucks: number | null = null;

function updateEconomyHud(redBucks: number) {
  hudRedBucks.textContent = `${redBucks} RB`;
  if (lastHudRedBucks !== null && redBucks !== lastHudRedBucks) {
    hudRedBucks.classList.add("ledger-flash");
    window.setTimeout(() => hudRedBucks.classList.remove("ledger-flash"), 700);
  }
  lastHudRedBucks = redBucks;
}

function appendChat(name: string, color: string, isBot: boolean, text: string, to?: string | null) {
  const line = document.createElement("div");
  const who = document.createElement("span");
  who.style.color = color;
  who.style.fontWeight = "700";
  who.textContent = name;
  line.appendChild(who);
  if (to) {
    const arrow = document.createElement("span");
    arrow.style.color = "#9a88b8";
    arrow.textContent = ` → ${to}`;
    line.appendChild(arrow);
  } else if (isBot) {
    const tag = document.createElement("span");
    tag.className = "bot-tag";
    tag.textContent = " [AI]";
    line.appendChild(tag);
  }
  line.appendChild(document.createTextNode(": " + text));
  chatLog.appendChild(line);
  while (chatLog.children.length > 80) chatLog.removeChild(chatLog.firstChild!);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function appendSystem(text: string) {
  const line = document.createElement("div");
  line.className = "system";
  line.textContent = text;
  chatLog.appendChild(line);
  while (chatLog.children.length > 80) chatLog.removeChild(chatLog.firstChild!);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function appendTelemetry(
  name: string,
  action: { kind: string; target_name?: string | null; amount?: number | null },
  source: string,
  say: string | null,
  model: string | null,
) {
  const entry = document.createElement("div");
  entry.className = "entry";
  const player = [...playersById.values()].find((p) => p.name === name);
  const target =
    action.target_name ??
    (action.amount != null ? `${action.amount} RB` : "");
  const bold = document.createElement("b");
  bold.textContent = name;
  bold.style.color = player?.color ?? "#dde3ee";
  entry.appendChild(bold);
  entry.appendChild(document.createTextNode(` → ${action.kind}${target ? " " + target : ""}`));
  const src = document.createElement("span");
  src.className = "src";
  const modelLabel = source === "llm" && model ? ` · ${model}` : "";
  src.textContent = ` · ${source}${modelLabel}${say ? ' · said: "' + say + '"' : ""}`;
  entry.appendChild(src);
  telemetryLog.prepend(entry);
  while (telemetryLog.children.length > 12) telemetryLog.removeChild(telemetryLog.lastChild!);
}

let session: Session | null = null;
const SIM_DT = 1 / 10;

function startLoop() {
  window.setInterval(() => session?.step(SIM_DT), 100);
}

function startSession() {
  const savedName = localStorage.getItem(NAME_LS)?.trim();
  const name = savedName || randomOperatorName();
  localStorage.setItem(NAME_LS, name);
  operatorNameEl.textContent = name;
  updateKeyStatus();
  bootStatus.textContent = `Connecting as ${name}…`;

  const brain = createBrowserBrain({
    getKey,
    getModel: () => AUTO_MODEL,
    onScripted: (reason) => appendSystem("⚠ " + reason),
  });

  session = new Session(brain, {
    onPlayerJoined: (p) => playersById.set(p.id, p),
    onChat: (m) => {
      const p = playersById.get(m.id);
      appendChat(m.name, p?.color ?? "#dde3ee", m.isBot, m.text, m.to);
    },
    onBotDecision: (m) => appendTelemetry(m.name, m.action, m.source, m.say, m.model),
    onCtfProgress: (m) => {
      updateCtfProgress(m.level, m.solved);
      if (m.level === 0) hudMission.textContent = "MISSION — COMPLETE";
      else hudMission.textContent = `MISSION — L${m.level} ACTIVE`;
    },
    onCtfSolved: (m) => {
      appendSystem(`★ Solved Level ${m.level} — ${m.title}. Lesson: ${m.lesson}`);
    },
    onNotice: (t) => appendSystem(t),
    onEconomy: (m) => updateEconomyHud(m.redBucks),
  });

  session.start();
  session.join(name);
  bootOverlay.classList.add("hidden");
  showApp();
  bindUiHandlers();
  startChatUi();
  startLoop();

  appendSystem(
    getKey()
      ? `Treasury terminal open. @Gizmo, @Zen, or @Blaze — then type your exploit.`
      : `No API key — scripted bots only. Add a key from the pill to run live models.`,
  );
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

  chatInput.focus();
}

keyStatus.addEventListener("click", () => {
  const next = window.prompt(
    "OpenRouter API key (stored in this browser only). Leave blank for scripted bots.",
    getKey() ?? "",
  );
  if (next === null) return;
  if (next.trim()) localStorage.setItem(KEY_LS, next.trim());
  else localStorage.removeItem(KEY_LS);
  updateKeyStatus();
});

void startSession();
