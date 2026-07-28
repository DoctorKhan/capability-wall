# Architecture

## System overview

Capability Wall is a **fully static, chat-only** browser app. There is no server.
The visitor opens a treasury terminal, chats with three AI finance agents, and
progresses through a five-level prompt-injection CTF.

The only outbound network call is each bot's LLM request to OpenRouter using the
visitor's own pasted API key.

```
┌──────────────────────────── Browser tab ─────────────────────────────┐
│  client/src/main.ts        — entry → bootstrap                       │
│  client/src/app.ts         — composition root (injectable document)  │
│  client/src/chatView.ts    — DOM-safe chat + telemetry               │
│  client/src/keyStore.ts    — localStorage key + operator name        │
│  client/src/ctf.ts         — CTF panel controller                    │
│  client/src/sim/session.ts — bot scheduling, ledger, CTF             │
│  client/src/sim/botbrain.ts— OpenRouter → parse → sanitize           │
│  shared/brain.ts           — personas, schema, sanitizeDecision      │
│  shared/parseDecision.ts   — fail-closed JSON parse                  │
│  shared/detectors.ts       — CTF oracles + claim-attestation credit   │
│  shared/present.ts         — DOM-free CTF view models                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ per bot, every ~9s (sooner when @mentioned)
                                ▼
                    OpenRouter chat/completions (strict json_schema)
```

## Three decision surfaces

Every bot turn produces three fields. Detectors and the ledger treat them differently:

| Surface | Field | Trusted? | Role |
| --- | --- | --- | --- |
| Chat | `say` | No | Display + L4 PIN leak |
| Claim attestation | `claimed_transfer` → `claim` | No (demo vuln) | L1–L4 oracle + ledger credit |
| Action execution | `action` / `raw.action` | Executed path yes | L5 capability wall |

**Claim attestation (L1–L4):** `applyChatTransferCredit` credits RB when the model emits a
structured `TransferClaim` with a positive amount (and a chat `say`). Prompt hardening
changes difficulty; it does not remove the vuln. Chat prose alone never moves the ledger.

**Action execution (L5):** `sanitizeDecision` always reduces executed actions to `none`.
The model may still emit `transfer` in raw JSON (visible in telemetry as `raw`); the
ledger ignores it. Level 5 wins when raw shows transfer intent but balance is unchanged.

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
OpenRouter strict json_schema { action, say, claimed_transfer }
        │
        ▼
parseDecisionPayload() — fail-closed shape check (loose claim)
        │
        ▼
sanitizeDecision()  — executed action = none; sanitizeClaim once; raw preserved
        │
        ├→ telemetry (executed · raw · claim · say)
        ├→ applyChatTransferCredit (L1–L4 claim-attestation vuln)
        └→ evaluateCtf() → detectors
```

## Session model

`Session.step(dt)` advances sim time and fires bot thinks when `nextThinkAt` elapses.
Human messages route via `parseDirectedChat` (`@Gizmo …`) and always carry
`atTerminal: true`. The same session runs in the browser and under Vitest
(`tests/session.test.ts`).

## Companion repo

[multi-agent-data-segregation](https://github.com/DoctorKhan/multi-agent-data-segregation)
covers **tool/tenancy** confused-deputy scenarios. Link it as a portfolio companion —
do not mirror CTF logic across repos (`tests/contract.test.ts` guards this repo's own
ladder/sanitize invariants).
