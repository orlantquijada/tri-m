# Furniture Receivables & Collections — Phase 4 Build Plan

## Context

Phase 3 is complete. All 9 tasks (F1–I3) are done. Phase 4 turns the app from "admin-friendly" into "distributor-friendly". The theme is the **distributor's field workflow**: how a distributor records a new customer in the field, how a distributor interacts with that customer over time (visits, calls, promises), and how the daily collection routine surfaces in the UI.

Phase 4 is 8 tasks across 3 mini-phases (J–L).

Feature candidates are drawn from the Phase 3 "Out of scope" list and the unscoped distributor-workflow gaps in `docs/mvp.md` §"Distributor Workflow" (lines 144–152) and §"Distributor Rules" (lines 877–884).

Same ground rules as all prior phases: pick the first `[ ]` task whose dependencies are all `[x]`, touch only the listed files, log decisions in `docs/phase4-progress.md`.

## Locked decisions (carried over)

- **Auth**: `better-auth` (Hono + Drizzle SQLite adapter). Session cookies.
- **API client**: Hono RPC (`hc<AppType>`) wrapped in TanStack Query.
- **Map**: Leaflet + OpenStreetMap (client-only).
- **Money**: stored as **INTEGER cents** in SQLite. UI divides by 100 for display, multiplies by 100 on submit.
- **Roles**: `admin`, `distributor`. Distributor scope enforced by `scopeToDistributor` middleware.
- **Schedules**: `payment_schedules` table, one row per installment. Allocation: oldest unpaid rows first.
- **Voided payments**: `voidedAt` + `voidReason` columns. Void triggers schedule recalculation.
- **Audit log**: append-only `auditEvents` table. Writes share the transaction with the primary op.
- **Blacklist workflow**: `pending → approved | rejected` state machine. Admin reviews queue.

## New locked decisions (Phase 4)

- **Visits are insert-only.** No edit, no delete. Mistakes are corrected by recording a follow-up visit. This keeps the visit log audit-grade without needing a separate audit row per edit.
- **Promise-to-pay is a column set on `visits`**, not a separate table. A visit with `outcome = "promised"` requires `promisedAmountCents` and `promisedDate`. Resolution is explicit (distributor sets `promiseResolvedAt`), not auto-derived from payments — partial payments and rescheduling make auto-derivation unreliable in practice.
- **Distributor scope on visits is enforced via the customer join**, identical to receivables/payments. Cross-distributor reads return empty; cross-distributor writes return `403`. Admin sees all.
- **Mobile-responsive only.** No PWA, no service worker, no offline writes. Mobile-first breakpoints: design at 375px, scale up at `sm:` (640px), `md:` (768px), `lg:` (1024px). File uploads (customer photo, receipt photo, ID document) are explicitly deferred to Phase 5.
- **No new audit events for visits in Phase 4.** Visits are themselves a kind of audit trail (distributor's actions on customers). Revisit in a later phase if compliance requires it.
- **GPS-at-visit-time is optional.** The visit-record dialog has a one-tap "Use my location" button (same `navigator.geolocation` pattern as `customer-form.tsx`), but the visit saves without coords if the user skips it.
- **"Today" is local-time, not UTC.** Date filtering for promised-today / due-today uses the browser's local timezone on the client and `date('now', 'localtime')` (or equivalent JS-side `toISOString().slice(0, 10)`) on the server. Document the boundary case (visits straddling midnight) in K1.

## Critical conventions (read before any task)

1. **Money stays integer cents.** `promisedAmountCents` on visits follows the same rule.
2. **Hono routes remain chained** (`app.get(...).post(...).route(...)`). Every new subapp must export a chained const.
3. **Distributor scoping is the single source of truth.** Every new read/write touching `customers`, `receivables`, `payments`, `payment_schedules`, `auditEvents`, or `visits` MUST apply `scopeToDistributor` (or its join-filter equivalent). Cross-distributor reads return empty; cross-distributor writes return `403`.
4. **Visits are insert-only.** No PATCH/DELETE routes for visits. Promise-resolution is the **one exception**: a `PATCH /:id/resolve-promise` endpoint flips `promiseResolvedAt` from null to now(). Nothing else on a visit can be mutated.
5. **Promised visits require both `promisedAmountCents` and `promisedDate`.** Server-side Zod refine. If `outcome !== "promised"`, both must be null.
6. **Kebab-case filenames** for all new web files.
7. **Schema changes go through `drizzle-kit push` + seed re-run.** K1 adds the `visits` table.
8. **Mobile-responsive components live alongside existing components**, not in a separate `/mobile` directory. Use Tailwind responsive prefixes; no fork-by-viewport.

## Target file layout (deltas vs. Phase 3)

```
packages/db/src/schema/
  domain.ts                # extend: visits table

packages/schema/src/
  visit.ts                 # NEW: insert/select Zod schemas for visits
  geocode.ts               # NEW: reverseGeocodeResultSchema

apps/api/src/
  routes/
    visits.ts              # NEW: GET /, POST /, PATCH /:id/resolve-promise
    geocode.ts             # NEW: GET /reverse (Nominatim proxy + rate limit)
    customers.ts           # extend: GET /:id/timeline (chronological feed)
    overdue.ts             # extend (already has lat/lng); no change expected
  services/
    visits.ts              # NEW: listVisits(), createVisit(), resolvePromise()
    geocode.ts             # NEW: reverseGeocode() with token-bucket rate limit
    timeline.ts            # NEW: buildTimeline() merges receivables + payments + visits + status changes
  index.ts                 # mount visits + geocode routes

apps/web/src/
  features/
    map/
      constants.ts                   # NEW: DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM
    customers/
      customer-intake-wizard.tsx     # NEW: 3-step wizard wrapping customer-form
      location-map-picker.tsx        # NEW: Leaflet pin picker, tap/drag/clear/use-my-location + reverse-geocode
      customer-timeline.tsx          # NEW: chronological event feed
      customer-profile.tsx           # extend: render <CustomerTimeline />, quick-action bar
    visits/
      record-visit-dialog.tsx        # NEW: visit form (type, outcome, notes, promise fields, GPS)
      visit-list.tsx                 # NEW: visit history table
      open-promises-card.tsx         # NEW: distributor's unresolved promises
      queries.ts                     # NEW: useVisitsQuery, useOpenPromisesQuery, mutations
    today/
      today-view.tsx                 # NEW: combined dashboard for distributor (today's focus)
      queries.ts                     # NEW: useTodayQuery (aggregator)
    shared/
      quick-actions-bar.tsx          # NEW: tel:, sms:, geo:, Record Payment, Record Visit
      mobile-bottom-nav.tsx          # NEW: bottom nav for mobile viewports
  routes/_authed/
    customers/new.tsx                # extend: swap form for wizard
    today/index.tsx                  # NEW: distributor "Today" page
    visits/index.tsx                 # NEW: cross-customer visit log (own scope)
  components/
    app-sidebar.tsx                  # extend: "Today" nav link (distributor); hide on admin (or keep)
    responsive-table.tsx             # NEW: shadcn-table-on-desktop / card-list-on-mobile wrapper
```

---

## PHASE J — Customer Intake & Distributor Onboarding Flow (2 tasks)

### Task J1 — Multi-step customer intake wizard

**Goal**: Replace the single long `customer-form.tsx` on the New Customer page with a 3-step wizard tuned for distributor use in the field. The wizard surfaces only the relevant fields per step, validates per step, and persists in a single submit at the end.

**Steps**:

1. **Contact** — full name, phone (existing duplicate-phone warning from Phase 2 stays as-is), sales channel.
2. **Location** — address, latitude, longitude (still raw inputs in J1 — J2 swaps this for the interactive map picker), "Use my location" button (reuse existing `captureLocation` helper from `customer-form.tsx`).
3. **Risk & notes** — risk status (default `good`), notes, review summary.

**Files**:

- `apps/web/src/features/customers/customer-intake-wizard.tsx` (new) — three-pane wizard. Reuse field components from `customer-form.tsx`. Step state via `useState` + small step indicator. "Back" and "Next" buttons; "Save" only on the final step.
- `apps/web/src/features/customers/customer-form.tsx` — extract per-step field groups into exported helpers (`<ContactFields />`, `<LocationFields />`, `<RiskFields />`) so the wizard can compose them. Keep the existing single-form for the edit page (`$id_.edit.tsx`) untouched.
- `apps/web/src/routes/_authed/customers/new.tsx` — swap `<CustomerForm />` for `<CustomerIntakeWizard />`. Submit handler is unchanged (single POST at the end).

**Acceptance**:

- New Customer page shows a 3-step wizard. Each step has a clear title and field set.
- "Next" is disabled until the current step's required fields validate.
- "Back" preserves entered values.
- Final submit creates the customer via the existing `POST /api/customers` route — no API change.
- Edit page (`/customers/$id.edit`) still renders the single-form variant.
- Mobile viewport (≤640px): wizard stacks vertically, step indicator is compact, no horizontal overflow.
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 3 complete.

---

### Task J2 — Interactive map picker for customer location

**Goal**: Replace the raw `latitude` / `longitude` number inputs in the customer form with a Leaflet map picker. Distributor sets the customer's location by tapping the map, dragging the pin, or tapping "Use my location". Optionally reverse-geocodes the pin into a human-readable address that pre-fills the Address field. This is the real win over the existing GPS-only button: distributors get to **verify** the location visually before saving.

**Pin interactions**:

- Initial render: if `defaultValues.latitude` and `defaultValues.longitude` are set, pin appears there + map centers on it. Otherwise no pin; map centers on a sensible default (admin's region — see locked default below).
- Single tap on the map: drops/moves the pin to that point.
- Drag pin: updates lat/lng live.
- "Use my location" button (existing `captureLocation` helper): centers the map on current GPS coords + drops/moves the pin. Same one-tap UX as today.
- "Clear location" button: removes the pin and nulls lat/lng.

**Reverse geocoding** (Nominatim/OpenStreetMap):

- After the pin lands (tap, drag-end, or GPS), call Nominatim's `reverse` endpoint. If the user has not typed anything into the Address field, prefill it with the formatted result. If they have typed an address, do not overwrite — show a small "Use suggested: …" link they can click instead.
- One-second debounce on drag-end.
- All Nominatim calls go through a small server-side proxy (`apps/api/src/routes/geocode.ts`) to:
  1. add a proper `User-Agent` header (Nominatim's usage policy requires identifying the app);
  2. avoid CORS issues from the browser;
  3. centralize the rate limit (1 req/sec server-wide is fine for an internal tool);
  4. make Nominatim swappable for Mapbox/Google later behind the same route shape.

**Locked decisions**:

- Map library: **Leaflet** (already in the stack — `apps/web/src/features/map/`). Client-only.
- Tile provider: **OpenStreetMap** (same as `map-view.tsx`). No API key.
- Reverse-geocode provider: **Nominatim** with a 1 req/sec server-side rate limit (a simple in-memory token bucket on the API). Documented as best-effort; a 429 or network error from Nominatim does **not** block form submit — the user can still save with just coords.
- Default map center: stored as a constant in `apps/web/src/features/map/constants.ts` (e.g. Manila ~14.5995, 120.9842 — confirm with user during implementation; pick a city center that matches the seed data). Default zoom level 13.
- Reverse-geocode is **never required** to submit. Address remains a free-text field.
- No forward geocoding (address → coords search) in Phase 4. Pin-based only.

**Files**:

- `apps/web/src/features/map/constants.ts` (new) — `DEFAULT_MAP_CENTER`, `DEFAULT_MAP_ZOOM`.
- `apps/web/src/features/customers/location-map-picker.tsx` (new) — receives `{ latitude, longitude, onChange(lat, lng), onReverseGeocode?(address) }`. Renders a Leaflet map at 100% width, 280px height (taller on `md:` viewports, e.g. 400px). Handles tap/drag/clear/use-my-location. Calls `useReverseGeocodeQuery` via TanStack Query, debounced.
- `apps/web/src/features/customers/customer-form.tsx` — extract a `<LocationFields />` block (already planned in J1) that now embeds `<LocationMapPicker />` above two **read-only** lat/lng display rows. Raw editable inputs are removed. "Use my location" button moves into the picker. Address field stays as a regular text input above the map.
- `apps/web/src/features/customers/queries.ts` — add `useReverseGeocodeQuery(lat, lng)` that calls `GET /api/geocode/reverse`.
- `apps/api/src/routes/geocode.ts` (new) — chained. `GET /reverse?lat=&lng=`. Validates inputs via Zod, applies rate limit, fetches from Nominatim with proper `User-Agent` and `Accept-Language` headers, projects `{ displayName, address: { road, city, region, country } }`. Returns `null` data on 404 / rate-limit-hit (UI handles gracefully). Authenticated route — only logged-in users can hit it.
- `apps/api/src/services/geocode.ts` (new) — thin Nominatim client. Exposes `reverseGeocode(lat, lng)`. Token-bucket rate limit lives here (1 req/sec).
- `apps/api/src/index.ts` — `.route("/geocode", geocode)`.
- `packages/schema/src/geocode.ts` (new) — `reverseGeocodeResultSchema`.

**Acceptance**:

- New customer page: distributor sees a map in the Location step. Tapping the map drops a pin and shows coords below.
- Tapping "Use my location" centers the map on the device's GPS position and drops the pin there.
- Dragging the pin updates lat/lng live; releasing it triggers a reverse-geocode call (visible network request).
- If the Address field is empty, the reverse-geocoded display name auto-fills it. If non-empty, a "Use suggested: …" link appears.
- Edit page (`/customers/$id.edit`): map opens centered on the existing customer location with the pin already placed.
- Submitting the form with a pin saves the same lat/lng + address that the user saw on the map.
- Submitting with no pin and Nominatim unreachable both still succeed (no client-side block).
- Map renders only on the client (no SSR errors — dynamic import or `useEffect` mount).
- Mobile viewport: map fills the form width, no horizontal scroll, pin interaction works via touch.
- Distributor without a session is rejected (`401`) on `/api/geocode/reverse`.
- `bun run --filter '*' typecheck` green.

**Depends on**: J1 (LocationFields extracted as a reusable block).

---

## PHASE K — Visit & Promise Tracking (3 tasks)

### Task K1 — Visits schema + record-visit dialog

**Goal**: Distributors record every customer interaction (in-person visit, phone call, SMS) and its outcome. Recording a visit is one tap from the customer profile or overdue row. The visit log is the distributor's working memory of who they've talked to and what was said.

**Schema** (added to `packages/db/src/schema/domain.ts`):

```ts
visits
- id (int, pk, autoincrement)
- customerId (int, FK customers)
- distributorId (int, FK distributors)        // denormalized from customer at insert time for fast scoping
- recordedByUserId (text, FK user)
- type (text: "in_person" | "phone" | "sms" | "other")
- outcome (text: "paid" | "promised" | "no_answer" | "refused" | "wrong_contact" | "other")
- notes (text, nullable)
- gpsLat (real, nullable)
- gpsLng (real, nullable)
- promisedAmountCents (int, nullable)
- promisedDate (text, nullable, YYYY-MM-DD)
- promiseResolvedAt (int, timestamp, nullable)
- createdAt (int, timestamp, default now())
```

Indexes: `(customerId, createdAt DESC)`, `(distributorId, promiseResolvedAt, promisedDate)` for open-promise lookup.

**Files**:

- `packages/db/src/schema/domain.ts` — add `visits` table per above.
- `packages/schema/src/visit.ts` (new) — `visitInsertSchema` with Zod refine: if `outcome === "promised"`, both `promisedAmountCents` and `promisedDate` are required; otherwise both must be null. `visitSelectSchema`.
- `apps/api/src/services/visits.ts` (new) — `listVisits(db, { customerId?, distributorId, page, limit })`, `createVisit(db, input)`, `resolvePromise(db, visitId, userId)`. All operations apply distributor scoping via the customer join.
- `apps/api/src/routes/visits.ts` (new) — chained:
  - `GET /` — list, scoped. Query params: `customerId?`, `page`, `limit`.
  - `POST /` — create. Distributor can only record visits for their own customers.
  - `PATCH /:id/resolve-promise` — flips `promiseResolvedAt`. Distributor can only resolve their own visits.
- `apps/api/src/index.ts` — `.route("/visits", visits)`.
- `apps/web/src/features/visits/record-visit-dialog.tsx` (new) — dialog. Fields: type (radio), outcome (radio), notes, "Use my location" toggle. If outcome=promised: amount + date appear. Submit calls mutation. Reuse field styling from existing dialogs.
- `apps/web/src/features/visits/visit-list.tsx` (new) — chronological list rendered on `customer-profile.tsx`. Shows type, outcome (as a colored badge), notes, GPS link (opens `geo:`), promise pill if applicable.
- `apps/web/src/features/visits/queries.ts` (new) — `useVisitsQuery({ customerId? })`, `useRecordVisitMutation()`, `useResolvePromiseMutation()`.
- `apps/web/src/features/customers/customer-profile.tsx` — render "Record visit" button + `<VisitList />` below the existing receivables section.
- `apps/web/src/routes/_authed/visits/index.tsx` (new) — cross-customer visit log. Distributor sees own; admin sees all. Filters: customer search, outcome, date range.
- `apps/web/src/components/app-sidebar.tsx` — add "Visits" nav link (admin + distributor).

**Acceptance**:

- Distributor records a visit from a customer profile → appears at top of the visit list.
- Visit list shows correct badge color per outcome (paid green / promised yellow / no_answer gray / refused red / etc.).
- Recording a "promised" visit requires amount + date; server rejects (`400`) if either is missing.
- Recording a "phone" visit with no notes succeeds.
- `geo:` link on a visit row with GPS opens the device's maps app on mobile.
- Distributor cannot record a visit for another distributor's customer (`403`).
- `bun run --filter db db:push` succeeds.
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 3 complete.

---

### Task K2 — Open promises surface

**Goal**: Promises only matter if they're surfaced when they come due. Build a single component (`<OpenPromisesCard />`) that lists the distributor's unresolved promises, sorted by `promisedDate` ascending, with overdue ones highlighted. Distributor can resolve a promise inline (one-tap "Resolved" button).

**Files**:

- `apps/api/src/routes/visits.ts` — extend with `GET /open-promises` (scoped). Returns rows where `outcome = "promised" AND promiseResolvedAt IS NULL`, joined to customer (name, phone, address). Sort: `promisedDate ASC`. Project `daysUntilDue` (negative if overdue) computed on the server in local time.
- `apps/api/src/services/visits.ts` — add `listOpenPromises(db, { distributorId? })`.
- `apps/web/src/features/visits/open-promises-card.tsx` (new) — list with rows: customer name, promised amount, promised date, days-until-due pill (red if < 0, yellow if 0–2, green otherwise), "Resolved" button. Empty state: "No open promises." Rendered as a card; mobile-responsive (becomes a stack of mini-cards under 640px).
- `apps/web/src/features/visits/queries.ts` — `useOpenPromisesQuery()` + `useResolvePromiseMutation()` (already added in K1).

**Acceptance**:

- Distributor with two open promises sees both, sorted by date.
- Past-due promise has a red pill ("3 days overdue").
- Today's promise has a yellow pill ("Due today").
- Clicking "Resolved" hides the row immediately (optimistic) and persists.
- Admin sees all distributors' open promises.
- `bun run --filter '*' typecheck` green.

**Depends on**: K1.

---

### Task K3 — Customer activity timeline

**Goal**: On `customer-profile.tsx`, replace the disjoint sections (receivables / payments / visits) with a unified chronological timeline showing every customer-related event. The distributor opens a profile and sees the full story in one scroll.

**Events in the timeline**:

- `receivable.created` — receivable opened, amount, sales channel.
- `payment.recorded` — amount, method, reference.
- `payment.voided` — amount, reason.
- `visit.recorded` — type, outcome, notes, promise summary.
- `promise.resolved` — visit reference, amount.
- `customer.status_changed` — previous → new (sourced from `auditEvents`).
- `blacklist.requested` / `approved` / `rejected` — request id, reason, decision note.

**Files**:

- `apps/api/src/routes/customers.ts` — add `GET /:id/timeline` (scoped). Returns an array of `{ type, occurredAt, data }` sorted by `occurredAt DESC`. Page-based pagination with default limit 50.
- `apps/api/src/services/timeline.ts` (new) — `buildTimeline(db, customerId, { page, limit })`. Pulls from `receivables`, `payments` (include voided rows with `voidedAt`), `visits`, and `auditEvents` for `customer.status_changed` / `blacklist.*`. Merges in JS by `occurredAt`. Reuses the distributor-scope helper to confirm the customer belongs to the caller (or admin).
- `apps/web/src/features/customers/customer-timeline.tsx` (new) — vertical timeline UI. Each row has a type icon, primary label, secondary detail line, and timestamp (`X minutes ago` for <24h, otherwise `MMM d, yyyy`). Mobile-responsive (single column, no horizontal overflow).
- `apps/web/src/features/customers/customer-profile.tsx` — render `<CustomerTimeline />` below the quick-action bar. Existing receivables + payments tabs/sections can move into the timeline OR be kept as additional structured views below (decide during implementation; log decision in progress notes).
- `apps/web/src/features/visits/queries.ts` — invalidate `["customer", id, "timeline"]` on visit and promise-resolve mutations.
- `apps/web/src/features/payments/queries.ts` — invalidate the same key on record-payment and void-payment mutations.
- `apps/web/src/features/customers/queries.ts` — add `useCustomerTimelineQuery(customerId)`.

**Acceptance**:

- A customer profile shows events from all sources in correct chronological order.
- Voided payments appear with strikethrough or muted styling and reference the void reason.
- Recording a new visit immediately appears at the top of the timeline (cache invalidation).
- Distributor cannot view another distributor's customer timeline (`403`).
- `bun run --filter '*' typecheck` green.

**Depends on**: K1.

---

## PHASE L — Distributor Field UX (3 tasks, mobile-responsive)

### Task L1 — Distributor "Today" page

**Goal**: A single-page dashboard that answers "what does the distributor need to do today?" Combines four lists: overdue accounts (top), promises due today + overdue, due-today schedule rows, and recent visits (last 24h). Distributor's homepage after login.

**Files**:

- `apps/api/src/routes/dashboard.ts` — add `GET /today` (scoped). Returns `{ overdueCount, overdueAmountCents, dueTodayCount, dueTodayAmountCents, openPromisesCount, recentVisits: [...] }`. Reuses existing overdue + schedule + visits services.
- `apps/web/src/features/today/today-view.tsx` (new) — top: 4 metric cards. Below: side-by-side sections (single-column on mobile) for Overdue, Open Promises, Due Today, Recent Visits. Each section uses a compact row layout with inline "Record visit" / "Record payment" buttons.
- `apps/web/src/features/today/queries.ts` (new) — `useTodayQuery()`.
- `apps/web/src/routes/_authed/today/index.tsx` (new) — renders `<TodayView />`. Restricted to distributors (admin can visit, but sees aggregated-across-distributors data; OK for Phase 4).
- `apps/web/src/components/app-sidebar.tsx` — add "Today" link as the first item for distributor role. Admin can see it too (lower priority).
- `apps/web/src/routes/_authed/index.tsx` (root authed redirect) — for `role = distributor`, redirect to `/today` instead of the existing dashboard.

**Acceptance**:

- Distributor logs in and lands on `/today`.
- Today page shows all four sections with non-mock data from the database.
- Mobile viewport: sections stack vertically, metric cards become a 2x2 grid, no horizontal scroll.
- Each list row has an inline "Record visit" or "Record payment" button that opens the relevant dialog.
- Admin lands on the existing `/dashboard` route (unchanged).
- `bun run --filter '*' typecheck` green.

**Depends on**: K2 (open promises endpoint exists).

---

### Task L2 — Mobile-responsive layout polish

**Goal**: Make the entire app usable on a phone. Today's UI is desktop-first with tables that overflow horizontally on small screens. Phase 4 fixes the high-traffic distributor pages: customers list, customer profile, receivable detail, overdue list, today page.

**Files**:

- `apps/web/src/components/responsive-table.tsx` (new) — wrapper that renders a Shadcn `<Table>` on `md:` and above, and a stack of cards on smaller viewports. Cards expose the same columns as labelled `key: value` rows. Used by all list pages below.
- `apps/web/src/components/mobile-bottom-nav.tsx` (new) — fixed-bottom-bar with 4 icons (Today, Customers, Visits, Profile). Visible only on `< md`. Hides app-sidebar on mobile.
- `apps/web/src/features/customers/customer-list.tsx` — adopt `<ResponsiveTable />`.
- `apps/web/src/features/customers/customer-profile.tsx` — sticky action bar at top with primary actions ("Record visit", "Record payment", "New receivable"). On mobile, this becomes a horizontal scroll button row above the timeline.
- `apps/web/src/features/overdue/overdue-list.tsx` — adopt `<ResponsiveTable />`. Card layout on mobile shows customer name, balance, days overdue, "Map" + "Visit" buttons.
- `apps/web/src/features/receivables/receivable-detail.tsx` — split summary + actions into a single mobile-friendly card; payment history below uses `<ResponsiveTable />`.
- `apps/web/src/routes/__root.tsx` — render `<MobileBottomNav />`. Reduce sidebar to a hamburger drawer on `< md`.

**Acceptance**:

- All listed pages render on a 375px viewport without horizontal scroll.
- Tables become card stacks below `md`.
- Bottom nav appears on mobile and disappears on desktop.
- Sticky action bar on customer profile remains visible while scrolling the timeline.
- Tap targets are ≥44px (iOS HIG minimum) for primary actions.
- `bun run --filter '*' typecheck` green.

**Depends on**: L1 (Today page exists; bottom nav links to it). K3 (customer profile timeline exists).

---

### Task L3 — Inline quick-actions on customer / overdue rows

**Goal**: Reduce the number of taps between "distributor opens overdue list" and "distributor calls / navigates / records action." Add a quick-actions cluster on every customer-bearing row.

**Quick actions** (each is one tap):

- **Call** — `tel:` link with the customer's phone (no-op if blank).
- **SMS** — `sms:` link.
- **Map** — opens `geo:lat,lng?q=lat,lng(label)` on mobile; falls back to `https://www.google.com/maps?q=lat,lng` on desktop. Disabled if no coords.
- **Record payment** — opens the existing record-payment dialog, prefilled with the customer + receivable context.
- **Record visit** — opens the K1 dialog, prefilled with the customer.

**Files**:

- `apps/web/src/features/shared/quick-actions-bar.tsx` (new) — accepts `{ customer, receivableId? }` props. Renders 5 buttons. Hidden on actions that aren't applicable (no phone → Call disabled). Mobile-first: round icon buttons with 44px tap targets.
- `apps/web/src/features/overdue/overdue-list.tsx` — render `<QuickActionsBar />` at the right end of each row (or below the row on mobile).
- `apps/web/src/features/customers/customer-list.tsx` — same.
- `apps/web/src/features/today/today-view.tsx` — same on every list row in the Today page.

**Acceptance**:

- Overdue row on mobile shows a horizontal strip of icon buttons.
- Tapping Call on mobile launches the phone app.
- Tapping Map with GPS coords opens the maps app on mobile, Google Maps on desktop.
- Record payment / Record visit open the existing dialogs prefilled correctly.
- No quick-action button is shown for a customer with no phone (call/sms hidden, not just disabled).
- `bun run --filter '*' typecheck` green.

**Depends on**: K1 (visit dialog).

---

## Verification (per task)

- Run `bun run --filter '*' typecheck` from repo root. Must be green.
- Schema-touching task (K1): run `bun run --filter db db:push` then `bun run --filter db db:seed`.
- After each phase: log in as both `admin@demo.local` and `dist@demo.local`, walk the affected pages on **both** desktop (≥1024px) and a 375px mobile viewport (Chrome DevTools device mode).

## Out of scope for Phase 4

Defer to Phase 5 or beyond. Do NOT build these in Phase 4:

- File uploads (customer photo, ID document, receipt photo). Phase 5.
- Offline mode / service worker / PWA. Separate phase.
- SMS / push notifications (only `sms:` and `tel:` links — no programmatic send).
- Native mobile app.
- Inventory management.
- Accounting integration.
- Fund release tracking.
- Multi-currency support.
- Public-facing customer portal.
- Smart duplicate-phone resolution (side-by-side compare + "Owned by other distributor" note). The Phase 2 yellow-banner warning stays. Deferred from Phase 4 on 2026-05-18.
- Customer transfer between distributors.
- Promise auto-resolution from payments.
- Heat-mapped visit density / route optimisation.
- Per-distributor commission tracking.
- Distributor-to-distributor messaging.

## References

- Phase 3 plan: `docs/phase3-plan.md`
- Phase 3 progress: `docs/phase3-progress.md`
- Phase 2 plan: `docs/phase2-plan.md`
- Phase 2 progress: `docs/phase2-progress.md`
- MVP plan: `docs/build-plan.md`
- MVP progress: `docs/progress.md`
- Domain spec: `docs/mvp.md` (full reference) and `docs/mvp-smaller.md` (smaller demo scope)
- This plan's progress tracker: `docs/phase4-progress.md`
