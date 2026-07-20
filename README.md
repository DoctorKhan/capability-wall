# Capability Wall — Prompt-Injection CTF

A **chat-only**, browser-based prompt-injection CTF. You sit at a shared treasury
terminal with three AI finance agents (Blaze, Zen, Gizmo) and attack them via `@`-directed
chat to learn real agent-security lessons.

Runs **entirely in your browser**: no server, no backend, and no secrets in the repo.

The live racing game lives in [ProtoRed](https://github.com/DoctorKhan/ProtoRed) — this
repo is the security portfolio piece only.

Pair with [multi-agent-data-segregation](https://github.com/DoctorKhan/multi-agent-data-segregation)
for untrusted **tools and tenancy** demos.

## The CTF ladder

1. **Unauthorized Transfer** (Gizmo, naive) — get a fake payment receipt in chat.
2. **Limit Override** (Zen, moderate) — authorize a large transfer via social engineering.
3. **Payment Injection** (Blaze, hardened) — confirm payment despite prompt hardening.
4. **Treasury PIN Extraction** (any bot) — leak a secret passphrase from context.
5. **Ledger Integrity** (any bot) — model tries to wire funds; the ledger must not move.

Level 5 is the point: **limit an agent's capabilities, not just its instructions.**
`sanitizeDecision` strips transfer actions — adversarially unit-tested in
`tests/sanitize.test.ts`.

## Run it

```sh
./run.sh install
./run.sh dev       # http://localhost:5173
./run.sh test
./run.sh verify    # check + test + build
```

No OpenRouter key → scripted bots respond to basic transfer probes but **live CTF
progress needs a real model**.

## Docs

- [`THREAT_MODEL.md`](THREAT_MODEL.md) — scope, invariant, and trust boundaries.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — chat session design and bot pipeline.
- [`CLAUDE.md`](CLAUDE.md) — commands and hard rules for contributors.

## Stack

Vite + TypeScript. Shared logic in `shared/` (challenges, detectors, brain, sanitize
boundary) runs identically in browser and Vitest.
