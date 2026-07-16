# Finance Ledger

Privacy-first personal finance ledger for fast capture, reliable history,
grouped spending, and future AI-assisted classification.

The product direction is an AI finance ledger where a user can type, say, or
photograph a financial event, then the app converts it into a traceable ledger
entry without retaining raw audio or receipt images.

## Current Stack

- Monorepo: pnpm workspaces and Turborepo
- API: NestJS
- Web: Next.js
- Mobile: Expo
- Database: PostgreSQL and Prisma
- Shared contracts: Zod schemas in `packages/contracts`

## Product Principles

- Postgres is the source of truth.
- Notion sync is optional and mirror-only.
- AI proposes structured intent; the backend validates and executes.
- Ledger entries are financial events, not spreadsheet rows.
- Group totals are calculated from entries.
- Raw media should be processed temporarily and deleted.
- Important state changes should write audit logs.

## Useful Docs

- [Product context](docs/product-context.md)
- [Architecture](docs/architecture.md)
- [Domain model](docs/domain-model.md)
- [AI intake](docs/ai-intake.md)
- [Privacy and audit](docs/privacy-and-audit.md)
- [Roadmap](docs/roadmap.md)
- [Decision: Postgres source of truth](docs/decisions/0001-postgres-ledger-source-of-truth.md)
- [Decision: AI proposes, backend executes](docs/decisions/0002-ai-proposes-backend-executes.md)

## Apps And Packages

```txt
apps/api       NestJS backend
apps/web       Next.js dashboard
apps/mobile    Expo mobile app

packages/contracts   Shared Zod schemas and DTO types
packages/database    Prisma schema, migrations, and client
```

## Development

Install dependencies:

```bash
pnpm install
```

Start infrastructure:

```bash
pnpm infra:up
```

Generate the Prisma client:

```bash
pnpm db:generate
```

Run migrations:

```bash
pnpm db:migrate
```

Seed repeatable development fixtures:

```bash
pnpm dev:seed
```

Start web and API:

```bash
pnpm dev
```

Run all checks:

```bash
pnpm check-types
pnpm lint
pnpm test
```

## Environment

The API currently uses a development user id through `DEV_USER_ID`. Production
auth should replace that before multi-user release.

Expected local variables include:

```txt
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/finance_ledger?schema=public
DEV_USER_ID=1b58fb29-1f33-43d8-bdf0-b70844c20045
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## MVP Target

The first strong MVP is:

1. Manual web ledger with accounts and categories.
2. Monthly net and category breakdowns.
3. Text command parsing for simple income and expenses.
4. Basic auto-categorization.
5. Entry groups and sub-events.
6. Audit logs for created and appended entries.

Voice, receipt OCR, advanced rules, and Notion sync come after the core model is
stable.
