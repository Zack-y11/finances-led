# Privacy And Audit

Privacy is not a small implementation detail in this product. It is a product
promise: capture can be smart without retaining raw evidence forever.

## Privacy Promise

The durable system should store financial facts and traceability, not raw media.

Store:

- Amount
- Currency
- Date
- Category
- Account
- Merchant
- Group
- Note
- Parser confidence
- Redacted transcript or parse payload when needed
- Audit event
- Media deletion timestamp or processing status

Do not store long term:

- Raw voice recordings
- Raw receipt photos
- Full unredacted documents
- Provider responses that include sensitive unrelated content

## Media Lifecycle

```txt
1. Mobile captures audio or image in local app cache.
2. App sends the media for processing.
3. Processor returns transcript, OCR text, or structured data.
4. App deletes the local media.
5. API stores a trace record with no raw media.
6. Audit log records the resulting command and deletion status.
```

The first version sends text, short voice clips, and receipt photos to
OpenRouter (`https://openrouter.ai/api/v1`) for parsing, transcription, and
vision extraction. Raw audio and receipt images are not retained after the
request. For a future stricter privacy mode, support local or self-hosted
transcription and OCR.

## Input Session Policy

An input session should answer:

- What modality was used?
- What was extracted?
- What command was proposed?
- What command was executed?
- Was raw media deleted?
- Did the user need to review anything?

It should not become a hidden media archive.

## Audit Log Policy

Write an audit event when the system:

- Creates a ledger entry
- Updates a ledger entry
- Appends an entry to a group
- Auto-categorizes an entry
- Applies a user rule
- Normalizes a merchant name
- Marks an entry as needing review
- Deletes or confirms deletion of raw media
- Syncs an entry to Notion

Audit logs should be useful to the user and developer. They should explain why a
change happened without leaking unnecessary raw input.

## Examples

```txt
LedgerEntry CREATE
Reason: User submitted manual form.
Metadata: { inputMethod: "manual" }
```

```txt
LedgerEntry APPEND_TO_GROUP
Reason: User said "agregalo a gasto semanal".
Metadata: { groupName: "Gasto semanal - Julio", confidence: 0.92 }
```

```txt
LedgerEntry AUTO_CATEGORIZE
Reason: Merchant rule matched Starbucks.
Metadata: { ruleId: "...", category: "Food" }
```

```txt
InputSession RULE_APPLIED
Reason: When merchant contains "Starbucks", set category to "Food" (rule "Starbucks Dining", priority 1).
Metadata: { appliedRules: [{ ruleId, ruleName, priority, actionField, actionValue, explanation }] }
```

```txt
LedgerEntry MERCHANT_NORMALIZED
Reason: Merchant "STARBUCKS #1842" was normalized to "Starbucks".
Metadata: { original: "STARBUCKS #1842", canonical: "Starbucks", merchantId: "..." }
```

```txt
InputSession MEDIA_DELETED
Reason: Raw voice audio was discarded after transcription.
Metadata: { mediaHash: "...", mediaDeleted: true, durableAudioStored: false }
```

```txt
InputSession MEDIA_DELETED
Reason: Raw receipt image was discarded after vision extraction.
Metadata: { mediaHash: "...", mediaDeleted: true, durableImageStored: false }
```

## Security Notes

- Every write must be scoped to the authenticated user.
- Every referenced account, category, group, rule, or merchant must belong to the
  authenticated user.
- Production auth should replace `DEV_USER_ID` before multi-user use.
- Do not log raw request bodies from media or AI endpoints.
- Redact secrets and sensitive text from application logs.
