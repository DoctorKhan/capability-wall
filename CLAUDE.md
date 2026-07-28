# Capability Wall — agent guide

A **fully static, chat-only** browser CTF: three AI treasury bots on a shared terminal,
built as a finance-agent security demo (five-level prompt-injection ladder). No server,
no backend, no secrets in the repo. Players paste their own OpenRouter key at runtime.

**Read `docs/ARCHITECTURE.md` and `PLAYBOOK.md` before changing anything structural.**

## Commands

Run `just` to list recipes. Every recipe wraps an npm script, so `pnpm run <script>`
(or `npm run <script>`) works when `just` is unavailable — see the README fallback table.

| Command | What it does |
|---------|--------------|
| `just install` | pnpm install |
| `just dev` | Vite dev server at http://127.0.0.1:5173 |
| `just preview` | Production build + local preview |
| `just test` | Vitest unit + session tests |
| `just coverage` | Tests + coverage report (`coverage/index.html`) |
| `just verify` | check + test + build (same gate as CI) |

## Architecture

- `shared/` — personas, parse, `sanitizeDecision`, CTF detectors/challenges, `present.ts`. No DOM.
- `client/src/sim/session.ts` — chat scheduling, ledger credit, CTF evaluation.
- `client/src/sim/botbrain.ts` — OpenRouter calls; falls back to `scriptedDecision`.
- `client/src/chatView.ts` — DOM-safe rendering.
- `client/src/keyStore.ts` — localStorage key + operator name.
- `client/src/keyModal.ts` — in-page key entry dialog (live site).

## Tests

- `tests/` mirrors the source layout; run `just coverage` to see gaps.
- Suites default to the `node` environment. DOM-facing files opt in with
  `// @vitest-environment jsdom` on line 1.
- `tests/helpers/memoryStorage.ts` — use it instead of real `localStorage`; Node 22's
  Web Storage global shadows jsdom's implementation.
- `tests/markup.test.ts` pins `client/index.html` ids against the `getElementById`
  lookups in `client/src/`; `tests/main.test.ts` boots the real page under jsdom.
- `it.fails(...)` marks a **known defect**: it passes while the bug exists and turns red
  when fixed. Delete the marker along with the fix — never add one to silence a failure.

## Hard rules

- All human chat is `atTerminal: true`.
- The three bot personas intentionally differ in prompt-injection hardening.
- Never weaken `sanitizeDecision` — CTF level 5 depends on transfer stripping.
- L1–L4 vulns use **claim-attestation credit**; L5 uses **action capability wall** — see PLAYBOOK.md.
