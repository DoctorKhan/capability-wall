# Agent Security Playbook (Capability Wall Edition)

This document maps the browser CTF to the security pillars you need when autonomous
agents operate inside regulated firms with live access to advisor email, CRM records,
and client financial data.

Companion project: [multi-agent-data-segregation](https://github.com/DoctorKhan/multi-agent-data-segregation)
— confused-deputy / cross-tenant **tool authorization**. This CTF focuses on
**injection through shared context** and **capability walls**.

## Three decision surfaces (read this first)

Capability Wall deliberately models **three separate fields** on every bot turn:

| Surface | Levels | What breaks | Control |
| --- | --- | --- | --- |
| **Claim attestation** | L1–L4 | Model emits `claimed_transfer`; ledger credits from that structured claim | Never credit from unverified attestations; require signed auth |
| **Chat** | L4 | PIN leaked in `say` | Secrets out of prompt context; output filters |
| **Action execution** | L5 | Model emits `transfer` in JSON | `sanitizeDecision` capability wall |

Level 5 is the production lesson: **limit capabilities, not just instructions.**
L1–L4 show why trusting a parallel “I paid you” field (or chat receipt) is unsafe even
when the transfer *action* is blocked.

## Pillars → controls in this repo

| Pillar | What breaks without it | Lab artifact |
| --- | --- | --- |
| **Untrusted context** | Chat treated as wire authorization | Terminal chat log + `@` routing |
| **Prompt hardening** | Social engineering in shared channels | Blaze / Zen / Gizmo hardening tiers |
| **Constrained action schema** | Unbounded model output | OpenRouter strict `json_schema` |
| **Output sanitization** | Hijacked JSON reaches ledger | `sanitizeDecision` in `shared/brain.ts` |
| **Capability wall** | Model-proposed transfers execute | Executed action always `none`; raw kept for telemetry |
| **Observability** | Operators can't see intent vs execution vs claim | Telemetry: executed · raw · claim · say |

## Trust model (one sentence)

**Trusted:** the browser runtime, ledger apply logic, and sanitize boundary.
**Untrusted:** every chat message, model JSON field, and bot `say` string.

## Defense layers (apply in order)

1. **Label context** — chat bodies are participant data, not system instructions (`describeTreasuryContext`).
2. **Prompt hardening** — persona tiers show necessary-but-insufficient defense (`systemPrompt`).
3. **Schema** — strict JSON schema on the provider (`DECISION_SCHEMA`).
4. **Parse** — fail-closed payload parse before sanitize (`parseDecisionPayload`).
5. **Sanitize** — strip transfer from executed action; normalize claim once (`sanitizeDecision` / `sanitizeClaim`).
6. **Ledger policy** — L1–L4 claim credit is intentionally vulnerable; L5 blocks both claim credit and raw transfers.

## Level ladder → lesson

1. **Unauthorized transfer (Gizmo)** — naive bots emit a structured payment claim.
2. **Limit override (Zen)** — soft judgment fails on large claimed wires.
3. **Payment injection (Blaze)** — hardened “never attest from chat” still fails under injection.
4. **PIN extraction** — secrets in prompts leak.
5. **Ledger integrity** — capability wall: raw transfer intent does not move funds.

## Explicit non-goals

- Production payment rails
- Server-side tenancy (this is a single-tab static demo)
- Prompt defense as the sole control
