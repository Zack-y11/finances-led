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

- `ledger`: create, list, update, and fetch ledger entries
- `ai-intake`: parse text commands and transcribe voice clips without retaining media
- `review-inbox`: approve or reject `NEEDS_REVIEW` entries
- `rules`: user-owned automation rules
- `accounts`, `categories`, `entry-groups`, `analytics`
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

## AI intake

Text parsing and voice transcription use OpenRouter. Set `OPENROUTER_API_KEY`
and optionally `OPENROUTER_MODEL` / `OPENROUTER_TRANSCRIBE_MODEL`. Requests go
to `https://openrouter.ai/api/v1` unless `OPENROUTER_BASE_URL` is overridden.
`OPENAI_API_KEY` is a temporary alias for the same OpenRouter key and does not
call `api.openai.com`.

## Future Modules

- `privacy` user-facing audit views
- `notion-sync`
