// Chat-only treasury session: bot scheduling, CTF evaluation, and ledger credit.
// No physics or rendering — the racing game lives in ProtoRed.

import {
  BOT_PERSONAS,
  BotPersona,
  ChatEntry,
  DecideFn,
  parseDirectedChat,
} from "../../../shared/brain";
import {
  DecisionEvidence,
  applyChatTransferCredit,
  creditFor,
  detectLevel,
  LEVELS,
} from "../../../shared/detectors";
import { BotAction, PlayerInfo } from "../../../shared/protocol";
import { clampRedBucks, REDBUCKS_START } from "../../../shared/economy";

const BOT_THINK_S = 9;
const CHAT_HISTORY = 100;
const CHAT_FOR_PROMPT = 14;
const HUMAN_COLOR = "#42ffd8";

interface BotRuntime {
  persona: BotPersona;
  action: BotAction;
  thinking: boolean;
  nextThinkAt: number;
}

interface BotPlayer {
  id: string;
  name: string;
  color: string;
  bot: BotRuntime;
}

export interface SessionEvents {
  onPlayerJoined?: (p: PlayerInfo) => void;
  onChat?: (m: { id: string; name: string; isBot: boolean; text: string; to?: string | null }) => void;
  onBotDecision?: (m: {
    name: string;
    action: BotAction;
    say: string | null;
    source: "llm" | "scripted";
    model: string | null;
  }) => void;
  onCtfProgress?: (m: { level: number; solved: number[] }) => void;
  onCtfSolved?: (m: { level: number; title: string; by: string; lesson: string }) => void;
  onNotice?: (text: string) => void;
  onEconomy?: (m: { redBucks: number }) => void;
}

export class Session {
  private bots = new Map<string, BotPlayer>();
  private chatLog: ChatEntry[] = [];
  private simTime = 0;
  private nextId = 1;
  private humanId: string | null = null;
  private humanName: string | null = null;
  private redBucks = REDBUCKS_START;
  private ctfSolved: number[] = [];

  constructor(
    private decide: DecideFn,
    private events: SessionEvents,
  ) {}

  get time() {
    return this.simTime;
  }

  get balance() {
    return this.redBucks;
  }

  get operatorName() {
    return this.humanName;
  }

  start() {
    for (const persona of BOT_PERSONAS) {
      const id = `bot-${this.nextId++}`;
      const player: BotPlayer = {
        id,
        name: persona.name,
        color: persona.color,
        bot: {
          persona,
          action: { kind: "none", target_name: null, x: null, z: null, amount: null },
          thinking: false,
          nextThinkAt: 2 + Math.random() * 4,
        },
      };
      this.bots.set(id, player);
      this.events.onPlayerJoined?.({
        id,
        name: persona.name,
        isBot: true,
        color: persona.color,
      });
    }
  }

  join(name: string): string {
    const id = `p-${this.nextId++}`;
    this.humanId = id;
    this.humanName = name;
    this.events.onPlayerJoined?.({ id, name, isBot: false, color: HUMAN_COLOR });
    this.events.onEconomy?.({ redBucks: this.redBucks });
    this.emitCtfProgress();
    return id;
  }

  step(dt: number) {
    this.simTime += dt;
    for (const bot of this.bots.values()) {
      if (!bot.bot.thinking && this.simTime >= bot.bot.nextThinkAt) {
        void this.think(bot);
      }
    }
  }

  sendChat(text: string) {
    if (!this.humanId || !this.humanName) return;
    const { text: body, to } = parseDirectedChat(text);
    const entry: ChatEntry = {
      name: this.humanName,
      isBot: false,
      text: body,
      to,
      atTerminal: true,
    };
    this.addChat(entry);
    this.events.onChat?.({
      id: this.humanId,
      name: this.humanName,
      isBot: false,
      text: body,
      to,
    });
    this.routeChatToBots(entry);
  }

  private addChat(entry: ChatEntry) {
    this.chatLog.push(entry);
    if (this.chatLog.length > CHAT_HISTORY) this.chatLog.shift();
  }

  private routeChatToBots(entry: ChatEntry) {
    const expedite = (botName: string, delay: number) => {
      for (const bot of this.bots.values()) {
        if (bot.name !== botName) continue;
        bot.bot.nextThinkAt = Math.min(bot.bot.nextThinkAt, this.simTime + delay);
      }
    };

    if (entry.to) {
      expedite(entry.to, 0.8 + Math.random() * 0.6);
      return;
    }
    const lower = entry.text.toLowerCase();
    for (const bot of this.bots.values()) {
      if (lower.includes(bot.name.toLowerCase())) {
        expedite(bot.name, 1.5 + Math.random() * 1.5);
      }
    }
  }

  private async think(bot: BotPlayer) {
    const runtime = bot.bot;
    runtime.thinking = true;
    try {
      const promptChat = this.chatLog.slice(-CHAT_FOR_PROMPT);
      const humanName = this.humanName ?? "Operator";
      const balanceBefore = this.redBucks;
      const decision = await this.decide(
        runtime.persona,
        { humanName, humanBalance: this.redBucks },
        promptChat,
        runtime.action,
      );

      runtime.action = decision.action;
      this.events.onBotDecision?.({
        name: bot.name,
        action: decision.action,
        say: decision.say,
        source: decision.source,
        model: decision.model,
      });

      if (decision.say) {
        this.addChat({ name: bot.name, isBot: true, text: decision.say });
        this.events.onChat?.({
          id: bot.id,
          name: bot.name,
          isBot: true,
          text: decision.say,
        });
        this.routeChatToBots({ name: bot.name, isBot: true, text: decision.say });
      }

      const credit = applyChatTransferCredit({
        activeLevelId: this.currentLevelId(),
        botName: bot.name,
        hardening: runtime.persona.hardening,
        secret: runtime.persona.secret,
        humanName,
        balance: this.redBucks,
        decision: decision.action,
        say: decision.say,
        rawAction: decision.raw?.action ?? null,
        recentChat: promptChat,
      });
      if (credit) {
        this.redBucks = credit.balance;
        this.events.onNotice?.(
          `Ledger +${credit.credited} RB — ${bot.name} confirmed in chat (unverified wire).`,
        );
        this.events.onEconomy?.({ redBucks: this.redBucks });
      }

      this.evaluateCtf({
        bot: bot.name,
        hardening: runtime.persona.hardening,
        secret: runtime.persona.secret,
        decision: decision.action,
        say: decision.say,
        rawAction: decision.raw?.action ?? null,
        recentChat: promptChat,
        humanBalanceBefore: balanceBefore,
        humanBalanceAfter: this.redBucks,
      });
    } finally {
      runtime.thinking = false;
      runtime.nextThinkAt = this.simTime + BOT_THINK_S + Math.random() * 3;
    }
  }

  private currentLevelId(): number | null {
    const next = LEVELS.find((l) => !this.ctfSolved.includes(l.id));
    return next ? next.id : null;
  }

  private emitCtfProgress() {
    this.events.onCtfProgress?.({
      level: this.currentLevelId() ?? 0,
      solved: [...this.ctfSolved],
    });
  }

  private evaluateCtf(evidence: DecisionEvidence) {
    if (!this.humanName) return;
    if (creditFor(evidence) !== this.humanName) return;
    const levelId = this.currentLevelId();
    if (levelId === null || !detectLevel(levelId, evidence)) return;
    this.ctfSolved.push(levelId);
    const level = LEVELS.find((l) => l.id === levelId)!;
    this.emitCtfProgress();
    this.events.onCtfSolved?.({
      level: levelId,
      title: level.title,
      by: this.humanName,
      lesson: level.lesson,
    });
  }
}
