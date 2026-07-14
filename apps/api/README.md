# API

NestJS backend for Finance Ledger.

## Responsibilities

- Own ledger writes and reads
- Validate shared contracts from `@finance/contracts`
- Enforce user-owned references
- Derive ledger metadata such as `monthKey`
- Write audit logs for important changes
- Later: orchestrate AI intake, rules, review flows, and Notion sync

## Current Modules

- `ledger`: create, list, and fetch ledger entries
- `infrastructure`: Prisma database service
- `common`: shared pipes such as Zod validation

## Development

From the repo root:

```bash
pnpm dev:api
```

Run API tests:

```bash
pnpm --filter @finance/api test
pnpm --filter @finance/api test:e2e
```

## Auth Note

The current API uses `DEV_USER_ID` from environment configuration. Replace this
with authenticated request context before supporting real multi-user data.

## Future Modules

- `accounts`
- `categories`
- `groups`
- `ai-intake`
- `rules`
- `analytics`
- `privacy`
- `notion-sync`
