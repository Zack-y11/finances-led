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

- `/` redirects to `/dashboard`
- `/dashboard`: live monthly overview with net history, expense breakdown, income breakdown, and recent transactions
- `/ledger`: manual ledger list, filters, detail pane, and create form backed by the API
- `/groups`: entry group list and create form
- `/groups/[id]`: group detail, computed total, linked entries, and append-entry form
- `/settings/accounts`: persistent account create/edit and deactivate/reactivate management
- `/settings/categories`: persistent category create/edit management

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
