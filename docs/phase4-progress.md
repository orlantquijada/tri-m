# Phase 4 Build Progress

Full task details in `docs/phase4-plan.md`. Phase 3 context in `docs/phase3-plan.md` + `docs/phase3-progress.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase J — Customer Intake & Distributor Onboarding Flow

- [x] **J1** — Multi-step customer intake wizard (3 steps: Contact → Location → Risk & notes)
- [x] **J2** — Interactive map picker for customer location (Leaflet pin, tap/drag/clear, reverse-geocode via Nominatim proxy)

## Phase K — Visit & Promise Tracking

- [ ] **K1** — Visits schema + record-visit dialog (visits table, route, dialog, profile integration)
- [ ] **K2** — Open promises surface (unresolved promises card, one-tap resolve)
- [ ] **K3** — Customer activity timeline (chronological feed merging receivables / payments / visits / status changes)

## Phase L — Distributor Field UX (mobile-responsive)

- [ ] **L1** — Distributor "Today" page (4 sections: overdue, promises, due today, recent visits)
- [ ] **L2** — Mobile-responsive layout polish (ResponsiveTable, bottom nav, sticky action bar, ≥44px tap targets)
- [ ] **L3** — Inline quick-actions on customer / overdue rows (Call, SMS, Map, Record payment, Record visit)

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-18 — plan — Phase 4 plan written. 8 tasks across 3 mini-phases (J–L). Theme: distributor field workflow — customer intake, visit/promise tracking, mobile-responsive UX. Locked: visits are insert-only (corrections via follow-up visit); promise-to-pay is a column set on visits, not a separate table; promise resolution is explicit (distributor toggles `promiseResolvedAt`), not auto-derived; "Today" uses browser local time; mobile-responsive only (no PWA / no offline / no file uploads — those deferred to Phase 5). No new audit events for visits in Phase 4 (visits are their own audit trail). Order: wizard → duplicate resolver → visits schema → open promises → timeline → today page → mobile polish → quick actions.
- 2026-05-18 — plan — Added J3 (interactive map picker for customer location). Now 9 tasks total (J: 3, K: 3, L: 3). Locked: Leaflet + OSM tiles (no key); Nominatim for reverse geocode via server-side proxy at `/api/geocode/reverse` with 1 req/sec token-bucket rate limit and proper `User-Agent` (Nominatim policy); pin-based only (no forward address search in Phase 4); reverse-geocode prefills Address field only when blank; submit succeeds even if Nominatim errors out. Raw lat/lng inputs land in J1 first (Location step uses existing form fields), then J3 swaps them for the map picker — keeps J1 small and ships J3 as an independent deliverable.
- 2026-05-18 — plan — Deferred J2 (smart duplicate-phone resolution) out of Phase 4. Phase 2 yellow-banner warning is enough for now. Renamed old J3 (map picker) → J2 to keep the J-phase contiguous. Phase 4 now 8 tasks total (J: 2, K: 3, L: 3).
- 2026-05-18 — J2 — Map picker: dynamic-import Leaflet in `useEffect` (mirrors `map-view.tsx`, avoids SSR crash). Click drops/moves marker; marker draggable with 1s debounce on `dragend` before reverse-geocode fires. "Use my location" recenters + drops pin. "Clear" removes marker + nulls form lat/lng. Reverse-geocode auto-fills Address when blank; else shows "Use suggested: …" link. Nominatim proxy at `/api/geocode/reverse` validates lat/lng, sends `User-Agent` (`tri-m-furniture-collections/1.0`) + `Accept-Language: en`, returns `{ data: null }` on rate-limit miss / network error so client never blocks submit. Token bucket: 1 token / sec, in-memory module-level. `customer-form.tsx`: removed raw lat/lng `Input`s + `validateLatitude/Longitude` + `captureLocation` helper — picker owns all of that. Default center: Manila (14.5995, 120.9842), zoom 13.
- 2026-05-18 — J1 — Wizard ships 3 steps (Contact / Location / Risk & notes). Refactored `customer-form.tsx` to export `useCustomerForm`, `CustomerFormApi`, `CustomerFormValues`, `ContactFields`, `LocationFields`, `RiskFields`, and `buildCustomerPayload`. `CustomerForm` keeps its single-form variant (edit page untouched). Wizard composes the three field groups in order; per-step `Next` calls `form.validateField(name, "change")` for each field in the current step and uses `form.Subscribe` to derive a reactive `canAdvance` flag (disables Next/Submit when required fields are empty or any current-step field errors). Final step renders `<RiskFields />` plus a read-only review summary of name/phone/address/coords sourced from `form.Subscribe`. Sales-channel skipped — not on customer schema (lives on receivables). Mobile: step indicator hides labels under `sm:`, Back/Cancel/Next stack column-reverse under `sm:`.
