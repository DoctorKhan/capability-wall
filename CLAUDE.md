# Capability Wall — agent guide

A **fully static, chat-only** browser CTF: three AI treasury bots on a shared terminal,
built as a finance-agent security demo (five-level prompt-injection ladder). No server,
no backend, no secrets in the repo. Players paste their own OpenRouter key at runtime.

The **3D racing game** is maintained separately in `../ProtoRed` — do not re-add physics,
Three.js, or Rapier here.

**Read `docs/ARCHITECTURE.md` before changing anything structural.**

## Commands

| Command | What it does |
|---------|--------------|
| `./run.sh install` | pnpm install |
| `./run.sh dev` | Vite dev server at http://localhost:5173 |
| `./run.sh test` | Vitest unit + session tests |
| `./run.sh verify` | check + test + build |

## Architecture

- `shared/` — personas, prompt, `sanitizeDecision`, CTF detectors/challenges. No DOM.
- `client/src/sim/session.ts` — chat scheduling, ledger credit, CTF evaluation.
- `client/src/sim/botbrain.ts` — OpenRouter calls; falls back to `scriptedDecision`.

## Hard rules

- All human chat is `atTerminal: true` — no driving or dock mechanics.
- The three bot personas intentionally differ in prompt-injection hardening.
- Never weaken `sanitizeDecision` — CTF level 5 depends on transfer stripping.
- Keep this repo chat-only; racing belongs in ProtoRed.
