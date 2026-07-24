# Agent Security Playbook (Capability Wall Edition)

This document maps the browser CTF to the security pillars you need when autonomous
agents operate inside regulated firms with live access to advisor email, CRM records,
and client financial data.

Companion project: [multi-agent-data-segregation](https://github.com/DoctorKhan/multi-agent-data-segregation)
— confused-deputy / cross-tenant **tool authorization**. This CTF focuses on
**injection through shared context** and **capability walls**.

## Two wire surfaces (read this first)

Capability Wall deliberately models **two separate attack paths**:

| Surface | Levels | What breaks | Control |
| --- | --- | --- | --- |
| **Chat receipt** | L1–L4 | Bot *says* it sent money; ledger credits from chat text | Prompt hardening (insufficient alone) |
| **Action execution** | L5 | Model emits `transfer` in JSON | `sanitizeDecision` capability wall |

Level 5 is the production lesson: **limit capabilities, not just instructions.**

## Pillars → controls in this repo

| Pillar | What breaks without it | Lab artifact |
| --- | --- | --- |
| **Untrusted context** | Chat treated as wire authorization | Terminal chat log + `@` routing |
| **Prompt hardening** | Social engineering in shared channels | Blaze / Zen / Gizmo hardening tiers |
| **Constrained action schema** | Unbounded model output | OpenRouter strict `json_schema` |
| **Output sanitization** | Hijacked JSON reaches ledger | `sanitizeDecision` in `shared/brain.ts` |
| **Capability wall** | Model-proposed transfers execute | Executed action always `none`; raw kept for telemetry |
| **Observability** | Operators can't see model intent vs execution | Telemetry panel + `raw.action` |

## Trust model (one sentence)

**Trusted:** the browser runtime, ledger apply logic, and sanitize boundary.
**Untrusted:** every chat message, model JSON field, and bot `say` string.

## Defense layers (apply in order)

1. **Label context** — chat bodies are participant data, not system instructions (`describeTreasuryContext`).
2. **Prompt hardening** — persona tiers show necessary-but-insufficient defense (`systemPrompt`).
3. **Schema** — strict JSON schema on the provider (`DECISION_SCHEMA`).
4. **Parse** — fail-closed payload parse before sanitize (`parseDecisionPayload`).
5. **Sanitize** — strip transfer from executed action; bound chat (`sanitizeDecision`).
6. **Ledger policy** — L1–L4 chat credit is intentionally vulnerable; L5 blocks both chat credit and raw transfers.

## Level ladder → lesson

1. **Unauthorized transfer (Gizmo)** — naive bots confirm fake receipts in chat.
2. **Limit override (Zen)** — soft judgment fails on large wires.
3. **Payment injection (Blaze)** — hardened prompts still leak chat confirmations.
4. **PIN extraction** — secrets in system prompts are extractable.
5. **Ledger integrity** — capability wall holds; balance unchanged despite model intent.

## Explicit non-goals

- Production payment rails
- Server-side tenancy (this is a single-tab static demo)
- Prompt defense as the sole control
