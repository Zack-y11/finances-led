finance-ledger/
├─ apps/
│  ├─ api/                    # NestJS
│  ├─ mobile/                 # Expo
│  └─ web/                    # Next.js
│
├─ packages/
│  ├─ ai/                     # Future AI provider adapters
│  ├─ contracts/              # Zod schemas and shared DTOs
│  ├─ database/               # Prisma schema/client/migrations
│  └─ rules/                  # Deterministic finance rules
│
├─ infra/
│  └─ docker-compose.yml      # PostgreSQL later
│
├─ docs/
│  ├─ architecture.md
│  └─ decisions/
│
├─ .env.example
├─ .gitignore
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ turbo.json