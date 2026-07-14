# 0001: Postgres Ledger Is The Source Of Truth

## Status

Accepted

## Context

The product started from a finance workflow that could be represented in Notion,
but future features need stronger guarantees:

- User-owned rows
- Fast filtered history
- Audit logs
- Grouped events and sub-events
- AI command execution
- Rule application
- Privacy and media deletion tracking
- Analytics views

Notion is useful as a display or export layer, but it is not ideal as the main
transactional database for this system.

## Decision

Postgres stores the canonical ledger, accessed through Prisma. Notion sync, if
implemented, is an optional mirror.

## Consequences

- Backend writes must target Postgres first.
- Analytics should be computed from Postgres data.
- Notion sync needs idempotency and conflict handling.
- Any Notion outage must not block core ledger use.
