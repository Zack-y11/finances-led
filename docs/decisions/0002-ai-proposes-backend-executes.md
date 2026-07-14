# 0002: AI Proposes, Backend Executes

## Status

Accepted

## Context

AI will parse text, voice transcripts, and receipt OCR into financial intent. If
AI writes directly to the database, the system becomes harder to validate,
audit, test, and secure.

## Decision

AI adapters return structured parsed intent with confidence, missing fields, and
an explanation. The backend validates references, applies deterministic rules,
chooses review versus execution, writes ledger rows, and records audit logs.

## Consequences

- Parser output becomes a contract, not an action.
- Low-confidence results can be reviewed before posting.
- Rule application remains explainable.
- Database writes stay inside normal service boundaries.
- Provider changes are easier because provider behavior is isolated.
