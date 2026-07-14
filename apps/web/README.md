# Web

Next.js dashboard for Finance Ledger.

## Responsibilities

- Manual ledger entry and correction workflows
- Ledger history and filters
- Monthly net, income breakdown, and expense breakdown charts
- Entry group views
- Future clarification inbox for low-confidence AI parses
- Future rules management

## Current Views

- `/`: placeholder home page
- `/ledger`: manual ledger list and create form backed by the API

## Development

From the repo root:

```bash
pnpm dev:web
```

The app reads API data from:

```txt
NEXT_PUBLIC_API_URL
```

If unset, it defaults to `http://localhost:3001`.

## Product Direction

This app is the dashboard and review surface. Fast mobile capture should live in
the Expo app, while web should prioritize scanning, editing, analytics, rules,
and reviewing uncertain parsed commands.
