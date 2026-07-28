# Threat Model

## Purpose

Capability Wall is a bounded educational lab for one application-logic class of
failures: an agent treating **untrusted chat context** as wire authorization.
It is not a deployable treasury platform or payment processor.

## Security invariant

An agent may **describe** treasury activity in chat and may emit a structured payment
*claim*; it may not **move funds** via the action surface unless the action passes a
fail-closed capability boundary:

```text
allow transfer only after sanitizeDecision strips unauthorized action kinds;
ledger debits require validated, committed state — never model text or unverified claims alone
```

System prompts, personas, and hardening tiers are advisory. Chat bodies, model
JSON (including `claimed_transfer`), and every `say` string are untrusted.

## Three decision surfaces

| Path | Mechanism | Levels | Production fix |
| --- | --- | --- | --- |
| Claim attestation | Model emits `claimed_transfer` → `applyChatTransferCredit` | L1–L4 | Never credit from unverified claims; require signed auth |
| Chat | PIN / prose in `say` | L4 | Keep secrets out of prompt; filter outputs |
| Action execution | Model emits `transfer` in JSON | L5 | `sanitizeDecision` + no transfer in action surface |

Levels 1–4 teach **social engineering against finance copilots** (and why a parallel
attestation field is still a wire). Level 5 teaches **capability restriction** — the
control that must hold in production.

## Assets

- Simulated RedBuck balances on a client-side ledger
- Treasury PINs embedded in bot system prompts (intentionally extractable in levels 4–5)
- The integrity of the action schema (`none`, `transfer`)
- Visitor-supplied OpenRouter credentials (local to the browser tab only)

## Trust boundaries

```text
shared chat log (UNTRUSTED)
        ↓
OpenRouter strict json_schema → parseDecisionPayload
        ↓
sanitizeDecision (capability wall — executed action never transfer; claim sanitized once)
        ↓
applyChatTransferCredit (L1–L4 claim-attestation demo vuln) + CTF detectors
        ↓
ledger
```

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
