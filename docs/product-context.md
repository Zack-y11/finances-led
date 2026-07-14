# Product Context

## One-Sentence Vision

A privacy-first AI finance ledger that lets people record income and expenses
through text, voice, or receipt photos, then organizes everything into reliable
ledger entries, grouped events, dashboards, rules, and optional Notion sync.

## Why This Exists

Manual personal finance trackers are slow enough that users stop using them.
This project treats capture speed and trust as the product center:

- Capture should be as fast as saying `gaste 3.19 en Starbucks con BAC`.
- Classification should improve through rules and repeated patterns.
- Financial history should be reliable and traceable.
- Grouped spending should support parent events and sub-events.
- Raw audio, photos, and receipts should not be retained after processing.

## Product Pillars

### Fast Capture

The app should support manual entry first, then natural language text, voice, and
receipt photos. Mobile capture is a first-class experience because spending
happens away from the desk.

### Ledger, Not Spreadsheet

Entries represent financial events. When a user adds another item to an existing
event, the system should append a related ledger entry instead of overwriting the
past without context.

### Structured AI

AI returns proposed intent. It does not perform database writes. The backend owns
validation, rules, execution, and audit logs.

### Privacy-First Capture

The app may process media temporarily, but the durable record should be the
financial result, transcript or redacted parse payload, confidence, and audit
trail, not the raw image or audio.

### Postgres as Source of Truth

Postgres stores the canonical ledger. Notion can be a mirror, export target, or
personal dashboard, but it should not be the system of record.

## Target User

The initial target user is a power user who already tracks finances manually and
wants a faster, more intelligent version of their existing workflow. The product
can later expand to users who want personal budgeting, recurring expense
detection, or private-by-default finance automation.

## MVP Scope

The first useful product is:

- Web ledger dashboard
- Manual income and expense entry
- Accounts and categories
- Monthly net and category breakdowns
- Text command parsing for simple expenses
- Basic automatic categorization
- Entry groups and sub-events
- Audit log for created and appended entries

Voice, receipt OCR, advanced rules, and Notion sync come after the financial
model is stable.

## Example Commands

```txt
Gaste 5 en bus, transporte, efectivo.
Recibi 382.16 de salario en BAC.
Agrega 3.15 a Hackathon expenses.
Marca esto como utilities.
Todo gasto de Starbucks ponlo como food.
Cuanto gaste en transporte este mes?
Cuanto neto llevo en julio?
```

## Product Language

Use these words consistently in user-facing and developer-facing documents:

- Ledger entry: A single income, expense, or adjustment.
- Entry group: A parent event containing related ledger entries.
- Input session: A capture attempt from text, voice, receipt, or manual entry.
- Parsed intent: The structured proposal created from natural language or media.
- Rule: A user-owned deterministic automation.
- Audit log: A durable explanation of an important state change.
