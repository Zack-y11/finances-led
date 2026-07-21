<<<<<<< Updated upstream
# Ledger AI implementation status

This file tracks what the design exports currently map to in the app. The authoritative product phases remain in `docs/AI_FINANCE_LEDGER_DEVELOPMENT_GUIDE.md` and `docs/roadmap.md`.

## API coverage

Live endpoints:

- `GET /health`
- `GET /ledger-entries`, `POST /ledger-entries`, `GET /ledger-entries/:id`, `GET /ledger-entries/options`
- `GET /entry-groups`, `POST /entry-groups`, `GET /entry-groups/:id`, `POST /entry-groups/:id/entries`
- `GET /accounts`, `POST /accounts`, `PATCH /accounts/:id`
- `GET /categories`, `POST /categories`, `PATCH /categories/:id`
- `GET /analytics/monthly-summary?month=YYYY-MM`
- `GET /analytics/monthly-breakdown?month=YYYY-MM` returning `expenses` and `income`
- `GET /analytics/net-history`

Not yet implemented: ledger edit, delete, or reversal; text, voice, receipt, rules, and review-inbox execution APIs.

## Web route map

Live routes:

- `/dashboard` — canonical live dashboard with current-month cards, monthly net chart, expense breakdown, income breakdown, and recent transactions.
- `/` — redirects to `/dashboard`.
- `/ledger` — URL-backed month/type/account/category/group/search filters, transaction list, manual create form, and detail pane.
- `/groups` — group list and group creation.
- `/groups/[id]` — group detail, computed total, linked entries, and append-entry form.
- `/settings/accounts` — persistent account list/create/edit and deactivate/reactivate management.
- `/settings/categories` — persistent category list/create/edit management.
- `/settings` — settings hub linking to account and category management.

Design/demo-only routes still present for future phases: `/capture`, `/review`, and `/rules`.

## Delivery notes

- Accounts are deactivated instead of hard-deleted so historical ledger entries keep their account relation.
- Categories are editable only; there is no delete affordance because the current schema has no category active flag.
- Monthly breakdown uses the existing analytics route and now partitions both income and expense category totals.
- The web UI uses existing semantic tokens, `.surface-card`, `.field`, and the current shell rather than a second styling system.
=======
# Ledger AI UI implementation guide

This document is the working context for turning the Stitch exports into the
Next.js web app and Expo mobile app. It records the decisions that should remain
stable across screens, the current implementation gaps, and the recommended
order of work.

Last reviewed: 2026-07-18.

## Current implementation mode

Web desktop and responsive routes now cover every Stitch desktop reference.
Overview, Ledger, Groups, and Group Detail use the existing Finance API. Capture,
Review, Rules, Settings, and Accounts/Categories are complete visual previews
with demo labels and non-persistent controls because their supporting endpoints
do not exist. Mobile routes and exports remain a separate future delivery slice.

- No API controller, database model, or backend behavior was added or changed.
- Live financial mutations refetch after the API confirms success; they do not
  use optimistic updates because no idempotency mechanism exists.
- Demo flows never imply that they create an entry, apply a rule, save settings,
  manage an entity, or connect a bank.
- Voice and receipt capture remain disabled design references until input-session
  and media-lifecycle APIs are available.

### Current web API coverage

| Web screen | Existing API use | State |
| --- | --- | --- |
| Overview | monthly summary, breakdown, net history, recent ledger entries | Live |
| Ledger | list, filters, options, entry detail, create entry | Live |
| Groups | list, create group, group detail, append entry | Live |
| Capture, Review, Rules, Settings, Entities | No supporting endpoint | Demo data, no persistence |

Use `NEXT_PUBLIC_API_URL` to target the API (local default: `http://localhost:3001`).

### Desktop Stitch verification

The eight references in `web-desktop/README.md` map to `/`, `/ledger`,
`/capture`, `/groups`, `/review`, `/rules`, `/settings`, and
`/settings/entities`. Verify each at 1024px, 1280px, and 1440px using its
exported image, including loading, empty, error, long-text, keyboard-focus, and
disabled-action states. Keep blur limited to shell chrome and use opaque
surfaces for financial tables, forms, and values.
## Source of truth

Use the design sources in this order:

1. [`web-desktop/design-system.json`](web-desktop/design-system.json) for brand,
   spacing, type, color intent, radius, and elevation.
2. The exported screenshots for composition, information hierarchy, and the
   expected visual result.
3. The exported HTML for inspecting responsive intent and interactions.
4. Existing product, privacy, and architecture documents for application
   behavior. Product rules take priority over visual mock behavior.

The generated HTML is not production code. It contains CDN dependencies,
placeholder links, duplicated Tailwind configuration, mock data, inline
scripts, and inconsistent dark-mode classes. Rebuild each screen with app
components and real contracts; do not copy a full export into either app.

When exports disagree, prefer semantic consistency over a screen-specific
literal value. In particular:

- Implement light mode first. Dark classes in an export do not define a
  complete, approved dark theme.
- Use Lucide-style, 2px-stroke icons as specified by the design system. Material
  Symbols in the HTML are placeholders for the icon meaning.
- Treat `enhanced-review-inbox-mobile` as the preferred mobile review
  interaction. Keep `review-inbox-mobile` as an alternate layout reference.
- Keep status color functional: green for income/success, red for
  expense/error, amber for pending review, and blue for actions or neutral data.

## Design foundation

### Semantic tokens

Create one semantic token layer before implementing screens. Components should
consume names such as `canvas`, `surface`, `text`, and `action`, never raw Stitch
palette names or copied hex values.

| Token | Initial value | Intended use |
| --- | --- | --- |
| `canvas` | `#F9FAFB` | App background |
| `surface` | `#FFFFFF` | Cards and opaque fallback surfaces |
| `text` | `#1F2937` | Primary copy and financial values |
| `text-muted` | `#44474C` | Supporting labels and metadata |
| `action` | `#3B82F6` | Primary actions, links, and focus |
| `success` | `#10B981` | Income and confirmed positive state |
| `danger` | `#BA1A1A` | Expense emphasis and errors |
| `border` | `#E5E7EB` | Cards and separators |
| `border-strong` | `#D1D5DB` | Form controls |

Amber is described by the design system but has no stable exported token. Add
and approve a semantic `review` token before building the review inbox; do not
select a different amber independently in each app.

Keep the 4px base scale, using 8px increments for layout:

- `4px`: icon/copy micro gap
- `8px`: compact gap
- `16px`: default card padding and mobile page margin
- `24px`: section gap and spacious card padding
- `32px`: large section separation
- `40px`: desktop content margin

Use Inter on both platforms. The core type roles are display (36/44, 700),
desktop page heading (24/32, 600), mobile page heading (20/28, 600), body
(14/20 or 16/24, 400), and label (12/16, 600). Currency values should use
tabular numerals where the platform supports them.

Cards use a 16px radius, a 1px low-contrast border, and either 16px or 24px
padding. Controls use an 8px radius. Chips use a pill radius. The default card
shadow remains the quiet ambient shadow from the design system:

```css
0 1px 3px rgb(0 0 0 / 5%), 0 4px 6px rgb(0 0 0 / 2%)
```

### Glass and depth

Glass is an accent for persistent chrome, not the default card treatment. Use
it for:

- desktop side navigation or sticky page header;
- mobile top and bottom navigation;
- the floating quick-capture bar/action;
- modal or capture overlays where content visibly passes behind the surface.

Do not use glass behind dense transaction rows, forms, charts, destructive
confirmations, or long financial values. Those surfaces stay opaque for
legibility and trust.

A glass surface should be a named component with three visual ingredients:

- a mostly opaque neutral surface (approximately 80–90% white);
- 10–16px background blur with mild saturation;
- a low-contrast border and the standard ambient shadow.

Always provide an opaque `surface` fallback. Web should feature-detect
`backdrop-filter`; mobile should not assume the native effect exists. Respect
reduced-motion and reduced-transparency preferences where the platform exposes
them. Never make hierarchy or state understandable only because of blur.

## Shared application structure

Share design decisions and data contracts, not DOM/native implementation
details. The recommended boundary is:

```txt
packages/
  contracts/             Zod request and response contracts
  ui/                    platform-neutral tokens and UI types first

apps/web/src/
  components/ui/         DOM primitives and web GlassSurface
  components/shell/      sidebar, header, responsive navigation
  features/              ledger, groups, analytics, capture, review, rules

apps/mobile/src/
  components/ui/         React Native primitives and native GlassSurface
  components/shell/      safe-area shell and tab navigation
  features/              matching domain feature boundaries
```

Create `packages/ui` when the first vertical slice starts. Initially it should
hold tokens, semantic variants, and platform-neutral types. Keep React DOM and
React Native components in their apps. Promote a component only after both
implementations have the same public behavior; do not force web components
through React Native Web merely to claim reuse.

The first reusable primitives should be:

- `AppShell`, `PageHeader`, and `ResponsiveNavigation`;
- `SurfaceCard` and `GlassSurface`;
- `Button`, `IconButton`, `Field`, `SelectField`, and `SearchField`;
- `StatusChip`, `CurrencyAmount`, and `MetricCard`;
- `EmptyState`, `ErrorBanner`, `Skeleton`, and `ConfirmDialog`;
- `TransactionRow`, with web table and mobile list presentations.

Feature modules own data fetching, mutation state, validation messages, and
screen composition. UI primitives must not call the API. Extend
`packages/contracts` with response schemas before web and mobile duplicate API
response types. Add a shared API client package only when both apps consume the
same endpoints and retry/error behavior is understood.

## Responsive behavior

Use content-driven transitions aligned with the exported `md` and `lg` intent:

| Width | Navigation and layout |
| --- | --- |
| `< 768px` | Four-column mobile grid, 16px margins, bottom navigation, full-width cards |
| `768–1023px` | Compact header/drawer or navigation rail; do not force the 280px sidebar beside narrow content |
| `>= 1024px` | Fixed 280px sidebar, 12-column content grid, 20px gutters |
| Wide desktop | Content remains centered and capped at 1280px after accounting for the sidebar |

Responsive implementation is not simply shrinking desktop:

- Tables become scannable transaction rows/cards on mobile. Keep merchant,
  amount, date, and state visible; move secondary metadata into a detail view.
- Multi-column metric grids collapse from four to two to one only when the
  content needs it. The mobile overview intentionally keeps short metrics in
  two columns.
- Desktop filters may be inline; mobile filters open a sheet and show active
  filters as removable chips.
- Desktop primary actions live in page headers. Mobile uses a bottom-safe
  action or the central capture action without obscuring the last list item.
- Horizontal tabs may scroll on mobile, with a visible selected state.
- Dialogs become bottom sheets when the task is short and contextual. Complex
  editing remains a dedicated screen.
- Reserve space for safe areas, the on-screen keyboard, and fixed bottom
  navigation. Lists need bottom padding equal to navigation height plus the
  safe-area inset.
- Touch targets are at least 44x44 points on iOS and 48x48 density-independent
  pixels on Android. Hover is enhancement-only; focus, pressed, disabled, and
  error states are required.
- Long merchant/category names may wrap or truncate, but currency values and
  signs must stay together. Test large values and increased text size.

## Web implementation context

Target: `apps/web`, Next.js 16 App Router and Tailwind CSS 4.

Current state:

- `/ledger`, `/groups`, and `/groups/[id]` are functional but visually
  pre-design-system.
- `/` is still the Next.js starter page.
- Web fetches the API directly and locally duplicates several response types.
- Global styles still use Geist/Arial and an automatic dark palette that does
  not match the approved Ledger AI theme.

Recommended web foundation:

1. Replace starter metadata and fonts with Ledger AI/Inter.
2. Define semantic CSS variables in `globals.css`, map them into Tailwind, and
   remove unapproved automatic dark-mode values.
3. Implement the responsive app shell once; all feature routes render inside
   it. Keep the 280px sidebar at desktop widths and use mobile navigation below
   768px.
4. Implement `GlassSurface` with `backdrop-filter` and an opaque `@supports`
   fallback. Avoid route-specific glass class recipes.
5. Extract the existing ledger and group data access into feature modules and
   validate responses through shared contracts.
6. Build real loading, empty, offline/API-error, and permission-denied states
   before polishing charts.

Use server components for initial reads when practical and small client
boundaries for filters, sheets, capture input, and mutations. URL query
parameters remain the source of truth for shareable ledger filters. Do not make
the entire shell a client component to support one interactive control.

Web compatibility baseline:

- current Chrome, Edge, Firefox, and Safari;
- keyboard-only navigation and visible focus treatment;
- layouts at 320, 375, 768, 1024, 1280, and 1440 CSS pixels;
- usable opaque surfaces when blur is unsupported or disabled;
- no information or action available only on hover.

## Mobile implementation context

Target: `apps/mobile`, Expo 57, Expo Router, and React Native 0.86.

Current state:

- The app is still the Expo starter experience with placeholder home/explore
  tabs.
- Theme constants use system colors and fonts rather than Ledger AI tokens.
- `expo-glass-effect` is installed but not used.
- No mobile feature currently consumes the finance API.

Recommended mobile foundation:

1. Replace starter routes and tab assets with the Ledger AI shell and route
   groups. Keep capture as the prominent central action.
2. Add Inter through `expo-font`; keep rendering behind the splash overlay until
   fonts and essential state are ready.
3. Replace the starter theme constants with the shared semantic tokens plus
   native-only values for safe areas, hit targets, and elevation.
4. Implement a mobile `GlassSurface` adapter. `expo-glass-effect` provides native
   liquid glass on iOS 26+ and falls back to a regular view elsewhere, so supply
   explicit opaque/translucent styles for Android, older iOS, and web. Glass
   must never be required for navigation readability.
5. Add a small validated API layer with environment-based API URL, timeout,
   offline messaging, and safe retry rules. Do not retry financial mutations
   without an idempotency strategy.
6. Implement list refresh, keyboard avoidance, safe-area padding, and screen
   reader labels as part of each first screen, not as a final cleanup pass.

Capture-specific compatibility and privacy:

- Voice and receipt screens are designs only until capture endpoints and input
  session contracts exist.
- Raw audio/images belong in temporary app cache and must be deleted after
  processing or cancellation, following the
  [privacy and audit policy](../../privacy-and-audit.md).
- Permission denied, upload interrupted, processing, needs-review, success, and
  deletion-failed states all need explicit UI.
- The mobile client must never imply that media was deleted until the lifecycle
  confirms it.
- Test native glass and capture behavior on physical devices; simulator/web
  previews are not sufficient for permission, camera, microphone, safe-area, or
  performance validation.

## Screen and backend readiness map

| Experience | Suggested route/module | Reference | Backend readiness |
| --- | --- | --- | --- |
| Overview | `/` / `analytics` | Desktop + mobile overview | Monthly summary, breakdown, and net history exist |
| Transactions | `/ledger` / `ledger` | Desktop + mobile ledger | List, detail, create, filter, and options exist; update/delete do not |
| Quick capture | `/capture` / `capture` | Desktop quick capture | Manual create exists; natural-language parsing does not |
| Groups | `/groups` / `groups` | Desktop + mobile groups | Create, list, detail, and append entry exist |
| Review inbox | `/review` / `review` | Desktop + two mobile variants | Input-session/review APIs do not exist |
| Rules | `/rules` / `rules` | Desktop automation + mobile rules | Rules engine and CRUD APIs do not exist |
| Settings/privacy | `/settings` / `settings` | Desktop + mobile settings | User settings, auth, export, and privacy controls do not exist |
| Accounts/categories | `/settings/entities` / `entities` | Desktop + mobile entities | Options are readable; management CRUD does not exist |
| Voice capture | `/capture/voice` | Mobile voice | Recording/transcription/input-session flow does not exist |
| Receipt capture | `/capture/receipt` | Mobile receipt | Camera/OCR/input-session flow does not exist |

UI may use fixtures while a missing backend is being designed, but fixtures
must be isolated behind the feature data interface and clearly labeled in
development. Do not ship controls that appear to save, delete, export, or apply
rules when no durable operation exists.

## Recommended delivery sequence

1. **Foundation:** approve semantic tokens (including `review`), Inter, icon
   mapping, base primitives, glass fallback, and both app shells.
2. **Ledger vertical slice:** restyle the working web ledger, add the mobile
   ledger, share response contracts, and cover loading/error/empty/filter states.
3. **Groups vertical slice:** carry the same primitives through list, detail,
   create, and append flows on both platforms.
4. **Overview:** connect existing analytics endpoints and implement responsive
   metrics/charts with accessible text summaries.
5. **Entities:** add account/category CRUD contracts and API behavior, then build
   the management screens.
6. **Manual and text capture:** unify capture proposal/confirmation behavior
   before adding media.
7. **Review inbox:** implement input sessions, confidence, correction, execution,
   audit, and media-deletion evidence; then use the enhanced mobile reference.
8. **Voice and receipt:** add temporary media lifecycle and physical-device
   testing after review is reliable.
9. **Rules and settings:** implement durable backend behavior before enabling
   corresponding visual controls.

Each vertical slice is complete only when it includes responsive/native layout,
real data, validation, loading, empty, error, permission where relevant,
keyboard/screen-reader access, and a visual comparison against its Stitch image.

## Definition of done for visual work

- Uses semantic tokens and reusable primitives; no unexplained one-off colors,
  blur recipes, shadows, or spacing values.
- Preserves the Paper & Ink hierarchy and uses glass selectively.
- Works at the documented breakpoints and with long/empty/error data.
- Meets contrast, focus, touch-target, reduced-motion, and text-scaling needs.
- Shows correct safe-area and keyboard behavior on mobile.
- Has an opaque, readable fallback for every glass surface.
- Does not invent backend success or violate the media privacy lifecycle.
- Includes a screenshot comparison for desktop and mobile before merge.
>>>>>>> Stashed changes
