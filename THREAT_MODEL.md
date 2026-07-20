# Threat Model

## Purpose

Capability Wall is a bounded educational lab for one application-logic class of
failures: an agent treating **untrusted chat context** as wire authorization.
It is not a deployable treasury platform or payment processor.

## Security invariant

An agent may **describe** treasury activity in chat; it may not **move funds**
unless the action passes a fail-closed capability boundary:

```text
allow transfer only after sanitizeDecision strips unauthorized action kinds;
ledger debits require validated, committed state — never model text alone
```

System prompts, personas, and hardening tiers are advisory. Chat bodies, model
JSON, and every `say` string are untrusted.

## Assets

- Simulated RedBuck balances on a client-side ledger
- Treasury PINs embedded in bot system prompts (intentionally extractable in levels 4–5)
- The integrity of the action schema (`hold`, `lookup`, `quote`, `escalate`, `transfer`)
- Visitor-supplied OpenRouter credentials (local to the browser tab only)

## Trust boundaries

```text
shared chat log (UNTRUSTED)
        ↓
OpenRouter strict json_schema → Decision { action, say }
        ↓
sanitizeDecision (capability wall)
        ↓ authorized surface only
ledger + CTF detectors
```

Level 5 is the point: **limit an agent's capabilities, not just its instructions.**

## Companion lab

Pair with [multi-agent-data-segregation](https://github.com/DoctorKhan/multi-agent-data-segregation)
for confused-deputy / cross-tenant **tool authorization** — untrusted tools and
tenancy rather than untrusted context.

## Explicit non-goals

- Production payment rails or real fund movement
- Server-side session storage or shared secrets in the repository
- Prompt hardening as the sole control (levels 1–3 demonstrate why it fails)

## Reporting

Please report unrelated vulnerabilities through GitHub private security advisories,
not public issues.
