# Repository Guidelines

## Project Structure & Module Organization

This is a private pnpm/Turborepo monorepo. `apps/api` contains the NestJS backend (`src/common`, `src/config`, `src/infrastructure`, and feature modules under `src/modules`); API end-to-end tests are in `apps/api/test`. `apps/web` is the Next.js App Router dashboard (`src/app`, shared UI in `src/components`, and API helpers in `src/lib`). `apps/mobile` is the Expo Router app, with routes in `src/app`, reusable components in `src/components`, and images in `assets`. Shared code lives in `packages/contracts` (Zod schemas), `packages/database` (Prisma schema and migrations), `packages/ai`, and `packages/rules`. Product and architecture documentation is in `docs`; local PostgreSQL infrastructure is in `infra`.

## Build, Test, and Development Commands

Use Node 22 and pnpm 10.26.1. Set up with `pnpm install`, `pnpm infra:up`, `pnpm db:generate`, and `pnpm db:migrate`. Run web and API with `pnpm dev`; use `pnpm dev:all` or `pnpm dev:mobile` for app-specific development. Run `pnpm check-types`, `pnpm lint`, `pnpm test`, and `pnpm build`. Run API e2e tests directly with `pnpm --filter @finance/api test:e2e`.

### Server and Infrastructure Cleanup

Always stop every server or persistent process you start before finishing work. Use `Ctrl+C` or terminate the exact process for `pnpm dev`, Expo, Next, Nest, or Prisma Studio. If you start Docker services, run `pnpm infra:down` when done.

## Coding Style & Naming Conventions

Use strict TypeScript settings, Prettier formatting, and ESLint. Follow the existing two-space formatting, single quotes, and trailing commas (especially in the API). Use `PascalCase` for classes and React components, `camelCase` for functions and variables, and descriptive kebab-case feature directories such as `entry-groups` and `ai-intake`. Nest files follow suffixes such as `.controller.ts`, `.service.ts`, `.module.ts`, and `.spec.ts`.

## Testing Guidelines

API unit tests use Jest and sit beside source files as `*.spec.ts`; integration tests use `apps/api/test/*e2e-spec.ts`. Add or update tests for behavior changes. No coverage threshold is configured; use `pnpm test:cov`.

## Commit & Pull Request Guidelines

Use the established `type(scope): summary` style, for example `feat(api): ...`, `fix(web): ...`, `test(api): ...`, `docs: ...`, or `chore(db): ...`. Keep commits focused. PRs should describe the behavior change, list validation commands, call out migrations or environment changes, link related issues, and include web/mobile screenshots when UI changes are involved.

## Security and Scoped Instructions

Keep secrets in ignored `.env*` files and use `.env.example` as the template. Preserve PostgreSQL as the source of truth, validate AI output on the backend, and avoid retaining raw media. Before changing web or mobile code, read the scoped guidance in `apps/web/AGENTS.md` or `apps/mobile/AGENTS.md`.
