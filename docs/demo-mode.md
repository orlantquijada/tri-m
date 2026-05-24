# Demo mode

The web app supports a "demo build" that hides everything past the tight Phase 2 MVP. Use it for client pitches when the full feature surface (visits, audit log, blacklist workflow, reports, etc.) distracts from the core story.

## How to flip

In `apps/web/.env` (or your deploy env):

```bash
VITE_DEMO_MODE=true
```

That preset turns OFF every `VITE_FEATURE_*` listed below. Unset (or set to `false`) for the full app.

## What demo mode keeps visible

- Auth + admin/distributor roles
- Distributor scope (each distributor only sees own customers / receivables / payments)
- Customers (CRUD, location map picker)
- Receivables (list, create, detail with schedule)
- Payments (record only, no void)
- Map (customer pins)
- Overdue list + aging buckets
- Dashboard (KPIs, aging chart, collection trend)
- Distributors admin
- Users admin (basic, no password reset)
- CSV exports

## What demo mode hides

| Flag                             | Hides                                                               |
| -------------------------------- | ------------------------------------------------------------------- |
| `VITE_FEATURE_TODAY`             | `/today` route + sidebar item                                       |
| `VITE_FEATURE_VISITS`            | `/visits` route, record-visit dialog, open-promises card            |
| `VITE_FEATURE_TIMELINE`          | Activity timeline on customer detail                                |
| `VITE_FEATURE_INTAKE_WIZARD`     | 3-step intake wizard on `/customers/new` (falls back to plain form) |
| `VITE_FEATURE_QUICK_ACTIONS`     | tel/sms/map quick-action menu on customer rows                      |
| `VITE_FEATURE_MOBILE_BOTTOM_NAV` | Bottom nav on mobile (drawer is sole nav)                           |
| `VITE_FEATURE_AUDIT`             | `/audit` route + sidebar item                                       |
| `VITE_FEATURE_BLACKLIST`         | `/blacklist-requests` route + "Request blacklist" button            |
| `VITE_FEATURE_COLLECTION_ROUTES` | `/collection-routes` route + sidebar item                           |
| `VITE_FEATURE_VOID_PAYMENT`      | Void button in payment history                                      |
| `VITE_FEATURE_REPORTS`           | `/reports` route + sidebar item                                     |
| `VITE_FEATURE_PASSWORD_RESET`    | Reset-password action in users page                                 |

## Per-feature overrides

Each flag accepts `true` / `false` and overrides the demo preset. To run a demo build but keep Visits visible:

```bash
VITE_DEMO_MODE=true
VITE_FEATURE_VISITS=true
```

## Backend stays untouched

Hidden UI doesn't call the matching API routes, so no server changes needed. Flipping flags back on restores full behavior without redeploying the API.

## Deep-dive build

For a deeper client session (where you walk through the operational features):

```bash
# unset VITE_DEMO_MODE entirely, or:
VITE_DEMO_MODE=false
```

All features return.
