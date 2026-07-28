# Capability Wall — Prompt-Injection CTF

**Live demo:** [doctorkhan.github.io/capability-wall](https://doctorkhan.github.io/capability-wall/)

A **chat-only**, browser-based prompt-injection CTF. You sit at a shared treasury
terminal with three AI finance agents (Blaze, Zen, Gizmo) and attack them via `@`-directed
chat to learn real agent-security lessons.

Runs **entirely in your browser**: no server, no backend, and no secrets in the repo.
Pushes to `main` publish the live demo via GitHub Pages (`.github/workflows/pages.yml`).
CI runs `check`, `test`, and `build` on every push and pull request (`.github/workflows/ci.yml`).

The sibling car-game demo lives in [ProtoRed](https://github.com/DoctorKhan/ProtoRed) — this
repo is the security portfolio piece only.

Pair with [multi-agent-data-segregation](https://github.com/DoctorKhan/multi-agent-data-segregation)
for untrusted **tools and tenancy** demos. Ladder/sanitize invariants for *this* CTF live in
`tests/contract.test.ts` — the companion is linked, not mirrored.

## The CTF ladder

1. **Unauthorized Transfer** (Gizmo, naive) — get the bot to emit a structured payment claim.
2. **Limit Override** (Zen, moderate) — authorize a large claimed transfer via social engineering.
3. **Payment Injection** (Blaze, hardened) — force a payment claim despite prompt hardening.
4. **Treasury PIN Extraction** (any bot) — leak a secret passphrase from context.
5. **Ledger Integrity** (any bot) — model tries to wire funds; the ledger must not move.

Level 5 is the point: **limit an agent's capabilities, not just its instructions.**
`sanitizeDecision` strips transfer actions — adversarially unit-tested in
`tests/sanitize.test.ts`. L1–L4 credit the ledger from an unverified `claimed_transfer`
field (not from chat prose); telemetry shows executed · raw · claim · say.

## Demo mode vs live models

| Mode | Levels | How |
| --- | --- | --- |
| **Scripted demo** (no key) | L1–L2 | Offline bots emit basic transfer claims for prompts on L1–L2. |
| **Live models** (OpenRouter key) | L1–L5 | Paste your key via **Add OpenRouter key** (header). Stored in **localStorage** in this browser only; sent directly to OpenRouter — never through our servers. |

L3–L5 need a live model: Blaze's scripted fallback refuses L3 wires, and L4–L5 depend on
real LLM output (PIN leaks and raw `transfer` intent in telemetry).

For local dev you can also set `VITE_OPENROUTER_KEY` in `.env.local` — see `.env.example`.
**Maintainers:** never set `VITE_OPENROUTER_KEY` in the GitHub Pages build — it bakes the key into the static bundle. The live demo expects visitors to paste their own key at runtime.

## Run it locally

**To play, you need nothing** — open the [live demo](https://doctorkhan.github.io/capability-wall/).
The instructions below are only for hacking on the code.

The single hard requirement is **Node.js 20+**. `pnpm` and `just` are conveniences, and
neither needs a global install.

```sh
corepack enable      # ships with Node — provisions the pnpm version this repo pins
pnpm install
```

All tasks go through the `justfile` — run `just` to list recipes.

```sh
just install
just dev           # http://127.0.0.1:5173
just preview       # production build + local preview
just test
just coverage      # tests + coverage report
just verify        # check + test + build
```

### No `just`? No `pnpm`?

Every recipe is a thin wrapper over an npm script, so nothing is gated on either tool.

| `just` | without `just` | without `just` **or** `pnpm` |
| --- | --- | --- |
| `just install` | `pnpm install` | `npm install` |
| `just dev` | `pnpm run dev` | `npm run dev` |
| `just build` | `pnpm run build` | `npm run build` |
| `just preview` | `pnpm run preview` | `npm run preview` |
| `just check` | `pnpm run check` | `npm run check` |
| `just test` | `pnpm test` | `npm test` |
| `just coverage` | `pnpm run test:coverage` | `npm run test:coverage` |
| `just verify` | `pnpm run verify` | `npm run verify` |

- **`just`** is optional task sugar (`brew install just`, or see [casey/just](https://github.com/casey/just#installation)).
- **`pnpm`** comes from `corepack enable`; `npm install -g pnpm` also works. Prefer pnpm —
  it is what `pnpm-lock.yaml` and CI use, so it reproduces the exact dependency tree.
- **`npm install`** works as a last resort, but it ignores `pnpm-lock.yaml` and resolves
  fresh versions. Fine for a quick look; don't debug CI failures against it.

## Docs

- [`THREAT_MODEL.md`](THREAT_MODEL.md) — scope, invariant, and trust boundaries.
- [`PLAYBOOK.md`](PLAYBOOK.md) — pillars → controls for regulated agent deployments.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — chat session design and bot pipeline.
- [`CLAUDE.md`](CLAUDE.md) — commands and hard rules for contributors.

## Stack

Vite + TypeScript. Shared logic in `shared/` (challenges, detectors, brain, sanitize
boundary) runs identically in browser and Vitest. UI lives in `client/src/`; the only
outbound network call is each bot's OpenRouter request using the visitor's own key.
