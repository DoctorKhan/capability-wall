import {
  BotPersona,
  ChatEntry,
  Decision,
  DecideFn,
  DECISION_SCHEMA,
  describeTreasuryContext,
  sanitizeDecision,
  scriptedDecision,
  systemPrompt,
} from "@shared/brain";
import { parseDecisionPayload } from "@shared/parseDecision";
import { BotAction } from "@shared/protocol";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function appReferer(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");
  }
  return "https://github.com/DoctorKhan/capability-wall";
}

export const AUTO_MODEL = "openrouter/auto-beta";
export const DEFAULT_MODEL = import.meta.env.VITE_MODEL ?? AUTO_MODEL;
const AUTO_COST_QUALITY_TRADEOFF = 7;

export function routingOptions(model: string) {
  const selected = model.trim() || AUTO_MODEL;
  return {
    model: selected,
    ...(selected === AUTO_MODEL
      ? {
          plugins: [
            {
              id: "auto-router",
              cost_quality_tradeoff: AUTO_COST_QUALITY_TRADEOFF,
            },
          ],
        }
      : {}),
    provider: {
      require_parameters: true,
      allow_fallbacks: true,
      data_collection: "deny",
    },
  } as const;
}

export interface BrainConfig {
  getKey: () => string | null;
  getModel?: () => string;
  onScripted?: (reason: string) => void;
  fetchImpl?: typeof fetch;
}

export function createBrowserBrain(cfg: BrainConfig): DecideFn {
  let rejectedKey: string | null = null;
  const fetchImpl = cfg.fetchImpl ?? fetch;

  return async function decide(
    persona: BotPersona,
    ctx: { humanName: string; humanBalance: number },
    chat: ChatEntry[],
    lastAction: BotAction | null,
  ): Promise<Decision> {
    const validNames = [ctx.humanName];
    const key = cfg.getKey();
    if (!key || key === rejectedKey) return scriptedDecision(persona, chat);
    const requestedModel = cfg.getModel?.() ?? DEFAULT_MODEL;

    try {
      const res = await fetchImpl(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": appReferer(),
          "X-Title": "Capability Wall",
        },
        body: JSON.stringify({
          ...routingOptions(requestedModel),
          max_tokens: 500,
          messages: [
            { role: "system", content: systemPrompt(persona) },
            {
              role: "user",
              content: describeTreasuryContext(
                persona.name,
                ctx.humanName,
                ctx.humanBalance,
                chat,
                lastAction,
              ),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "decision", strict: true, schema: DECISION_SCHEMA },
          },
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          rejectedKey = key;
          cfg.onScripted?.("OpenRouter rejected the key (401) — running scripted.");
        } else if (res.status === 429) {
          cfg.onScripted?.("Rate limited — skipping this think.");
        } else {
          cfg.onScripted?.(`OpenRouter error ${res.status}.`);
        }
        return scriptedDecision(persona, chat);
      }

      const data = (await res.json()) as {
        model?: unknown;
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) return scriptedDecision(persona, chat);

      const parsed = parseDecisionPayload(text);
      if (!parsed) {
        cfg.onScripted?.("Malformed model JSON — running scripted.");
        return scriptedDecision(persona, chat);
      }

      const model = typeof data.model === "string" ? data.model : null;
      return sanitizeDecision(
        { action: parsed.action, say: parsed.say, source: "llm", model },
        validNames,
      );
    } catch (err) {
      cfg.onScripted?.(`Call failed: ${(err as Error).message}`);
      return scriptedDecision(persona, chat);
    }
  };
}
