# Architecture

## System overview

Capability Wall is a **fully static, chat-only** browser app. There is no server, no
3D renderer, and no physics engine. The visitor opens a treasury terminal, chats with
three AI finance agents, and progresses through a five-level prompt-injection CTF.

The only outbound network call is each bot's LLM request to OpenRouter using the
visitor's own pasted API key.

```
┌──────────────────────────── Browser tab ─────────────────────────────┐
│  client/src/main.ts        — boot, key handling, chat UI             │
│  client/src/sim/session.ts — bot scheduling, ledger, CTF           │
│  client/src/sim/botbrain.ts— OpenRouter → Decision                 │
│  client/src/ctf.ts         — ladder panel                          │
│  shared/brain.ts           — personas, schema, sanitizeDecision    │
│  shared/detectors.ts       — CTF oracles                           │
└───────────────────────────────┬────────────────────────────────────┘
                                │ per bot, every ~9s (sooner when @mentioned)
                                ▼
                    OpenRouter chat/completions (strict json_schema)
```

**Related repo:** the live racing game with AI drivers lives in
[ProtoRed](https://github.com/DoctorKhan/ProtoRed). That split keeps the security demo
focused and the game fun without coupling them.

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
sanitizeDecision()  — strips transfer actions, bounds chat
        │
        ├→ telemetry panel
        ├→ optional vulnerable ledger credit (L1–L4 demo)
        └→ evaluateCtf() → detectors
```

Level 5 proves the **capability wall**: the model may emit `transfer` in raw output, but
`sanitizeDecision` reduces the executed action to `none` and the trusted ledger ignores it.

## Session model

`Session.step(dt)` advances sim time and fires bot thinks when `nextThinkAt` elapses.
Human messages route via `parseDirectedChat` (`@Gizmo …`) and always carry
`atTerminal: true`. The same session runs in the browser and under Vitest
(`tests/session.test.ts`).
