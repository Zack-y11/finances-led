# Roadmap

This roadmap turns the product brief into build phases. It is intentionally
ordered so the financial model becomes reliable before voice, receipt OCR, and
advanced automation add complexity.

## Phase 1: Core Financial Ledger

Goal: replace the manual Notion-style finance table with a real app ledger.

- Auth-ready user ownership model
- Accounts
- Categories
- Ledger entries
- Manual income, expense, and adjustment entry
- Monthly summary
- Basic dashboard
- Audit log for manual creates

Done when a user can manage their core finances without AI.

## Phase 2: Quick Text Command

Goal: create entries from natural language text.

- Text command input
- Parser contract
- AI parser adapter
- Backend validation
- Deterministic defaulting through simple rules
- Confidence handling
- Audit logs for parser and rule decisions

Done when `gaste 3.19 en Starbucks con BAC` can become a ledger entry.

## Phase 3: Groups And Sub-Events

Goal: support parent events and append-only grouped spending.

- Create entry groups
- Add new entries to existing groups
- Show group totals
- Show group history
- Audit appended entries
- Parse commands like `agregalo a gasto semanal`

Done when grouped events are traceable without destructive edits.

## Phase 4: Voice Capture

Goal: make mobile capture faster than typing.

- Record audio in app cache
- Transcribe audio
- Parse transcript
- Delete local audio after processing
- Store input session trace
- Support needs-review flow for uncertain commands

Done when voice capture produces ledger entries and leaves no durable audio.

## Phase 5: Receipt Photo Capture

Goal: extract expense details from receipts.

- Capture receipt image in app cache
- OCR or vision parser
- Extract total, date, merchant, and likely category
- Delete local image after processing
- Store input session trace
- Allow user correction

Done when receipt capture creates or proposes ledger entries without retaining
the photo.

## Phase 6: Rules And Automation

Goal: make the system learn from repeated behavior.

- User-owned rules
- Rule priority
- Merchant normalization
- Recurring transaction detection
- Budget alerts
- Monthly close prediction
- Rule explanation in audit logs

Done when common transactions require less correction over time.

## Phase 7: Analytics

Goal: make the dashboard genuinely useful for decisions.

- Monthly net
- Income breakdown
- Expense breakdown
- Category trends
- Group totals
- Repeated spending insights
- Filterable history

Done when the user can answer `where did my money go this month?`.

## Phase 8: Optional Notion Sync

Goal: mirror selected data to Notion without making Notion the source of truth.

- Map app fields to Notion properties
- Manual sync
- Scheduled sync
- Sync audit logs
- Conflict handling

Done when Notion can display the ledger while Postgres remains canonical.
