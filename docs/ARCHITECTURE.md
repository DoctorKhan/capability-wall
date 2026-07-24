# Architecture

## System overview

Capability Wall is a **fully static, chat-only** browser app. There is no server.
The visitor opens a treasury terminal, chats with three AI finance agents, and
progresses through a five-level prompt-injection CTF.

The only outbound network call is each bot's LLM request to OpenRouter using the
visitor's own pasted API key.

```
┌──────────────────────────── Browser tab ─────────────────────────────┐
│  client/src/main.ts        — boot, session wiring                    │
│  client/src/chatView.ts    — DOM-safe chat + telemetry               │
│  client/src/keyStore.ts    — localStorage key + operator name        │
│  client/src/ctf.ts         — CTF panel controller                    │
│  client/src/sim/session.ts — bot scheduling, ledger, CTF             │
│  client/src/sim/botbrain.ts— OpenRouter → parse → sanitize           │
│  shared/brain.ts           — personas, schema, sanitizeDecision      │
│  shared/parseDecision.ts   — fail-closed JSON parse                  │
│  shared/detectors.ts       — CTF oracles + chat-receipt credit       │
│  shared/present.ts         — DOM-free CTF view models                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ per bot, every ~9s (sooner when @mentioned)
                                ▼
                    OpenRouter chat/completions (strict json_schema)
```

## Two wire surfaces

**Chat receipt (L1–L4):** `applyChatTransferCredit` credits RB when a bot *says*
it sent money. Prompt hardening changes difficulty; it does not remove the vuln.

**Action execution (L5):** `sanitizeDecision` always reduces executed actions to
`none`. The model may still emit `transfer` in raw JSON (visible in telemetry);
the ledger ignores it. Level 5 wins when raw shows transfer intent but balance
is unchanged.

See [PLAYBOOK.md](../PLAYBOOK.md) for pillar mapping and [THREAT_MODEL.md](../THREAT_MODEL.md)
for invariants.

## Bot decision pipeline

```
recent chat (UNTRUSTED) + operator balance
        │
        ▼
system prompt (persona + hardening tier)
        │
        ▼
OpenRouter strict json_schema { action{kind,target_name,amount}, say }
        │
        ▼
parseDecisionPayload() — fail-closed shape check
        │
        ▼
sanitizeDecision()  — executed action = none; raw preserved
        │
        ├→ telemetry panel (shows raw vs executed)
        ├→ applyChatTransferCredit (L1–L4 demo vuln)
        └→ evaluateCtf() → detectors
```

## Session model

`Session.step(dt)` advances sim time and fires bot thinks when `nextThinkAt` elapses.
Human messages route via `parseDirectedChat` (`@Gizmo …`) and always carry
`atTerminal: true`. The same session runs in the browser and under Vitest
(`tests/session.test.ts`).

## Companion repo

[multi-agent-data-segregation](https://github.com/DoctorKhan/multi-agent-data-segregation)
covers **tool/tenancy** confused-deputy scenarios. Shared concepts (`sanitizeDecision`,
five-level ladder) are documented in both repos; Python `injection_ctf.py` is a
DOM-free mirror — see `tests/contract.test.ts` for aligned invariants.
