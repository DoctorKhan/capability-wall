# Capability Wall — agent guide

A **fully static, chat-only** browser CTF: three AI treasury bots on a shared terminal,
built as a finance-agent security demo (five-level prompt-injection ladder). No server,
no backend, no secrets in the repo. Players paste their own OpenRouter key at runtime.

**Read `docs/ARCHITECTURE.md` and `PLAYBOOK.md` before changing anything structural.**

## Commands

| Command | What it does |
|---------|--------------|
| `./run.sh install` | pnpm install |
| `./run.sh dev` | Vite dev server at http://localhost:5173 |
| `./run.sh test` | Vitest unit + session tests |
| `./run.sh verify` | check + test + build |

## Architecture

- `shared/` — personas, parse, `sanitizeDecision`, CTF detectors/challenges, `present.ts`. No DOM.
- `client/src/sim/session.ts` — chat scheduling, ledger credit, CTF evaluation.
- `client/src/sim/botbrain.ts` — OpenRouter calls; falls back to `scriptedDecision`.
- `client/src/chatView.ts` — DOM-safe rendering.
- `client/src/keyStore.ts` — localStorage key handling.

## Hard rules

- All human chat is `atTerminal: true`.
- The three bot personas intentionally differ in prompt-injection hardening.
- Never weaken `sanitizeDecision` — CTF level 5 depends on transfer stripping.
- L1–L4 vulns use **chat receipt credit**; L5 uses **action capability wall** — see PLAYBOOK.md.
