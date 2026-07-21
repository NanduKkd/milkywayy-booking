# Promotions management security test plan

- Last updated: 2026-07-21
- Test-assurance Project snapshot (2026-07-21):
  - parent feature #28: final closeout is tracked in its GitHub issue; the
    merged assurance evidence below is independent of that workflow transition
  - PRM-307 (#30), PRM-308 (#29), and PRM-310 (#32): `DONE`
  - PRM-309 (#31): `DONE`
  - PRM-312 (#33) and PRM-311 (#34): `DONE`
  - PRM-313 (#35): `DONE`; it owns the committed CI gates below

Each child gate owns separate proof. Completing one child does not complete the
parent feature or any dependency-gated successor.

## PRM-307 disabled-customer eligibility gate

- Personal customer lookup requires `role = CUSTOMER` and `disabledAt = null`,
  excluding staff and disabled customers.
- Direct personal-promotion assignment enforces the same eligibility predicate;
  disabled, staff, and missing users receive the same non-enumerating
  `Customer account not found` error and create no assignment or audit event.
- Enabled customers remain searchable and assignable, while disabling an
  account leaves historical assignment rows intact for audit.

Run the focused gate with:

```sh
npm test -- --runInBand src/lib/services/__tests__/promotionAdmin.test.js
```

## PRM-308 validation and lifecycle gate

- Table-driven `promotionAdmin` service tests independently cover create
  normalization; update preserve, set, clear, inactive-conflict, and no-op
  behavior; kind/code/trigger invariants; benefit and limit boundaries; explicit
  timestamp grammar and ordered ranges; status isolation; and boolean trigger
  flags.
- Active generic-code conflicts are tested case-insensitively across create,
  update, and activation. Known race-time unique-constraint failures at those
  writes map to the same stable conflict message, while unrelated errors remain
  unchanged.
- Lifecycle unit tests cover draft/paused activation, draft/active pause,
  repeated no-op actions, direct-update rejection, and terminal deactivation.
- Assignment and unassignment tests reject wrong kinds, missing promotions or
  customers, duplicate active assignments, and missing active assignments while
  proving successful unassignment preserves the historical row. A known
  assignment unique-constraint race maps to the stable duplicate message;
  unexpected errors are retained.
- Eligibility timestamp tests run under `Pacific/Kiritimati` and
  `America/Los_Angeles` to prove date-only, offset-free admin values, and
  offset-bearing inputs normalize independently of the server time zone.

The PRM-308 cases are mocked service-boundary unit tests. Real database
contention is covered separately by PRM-310 below; action/page coverage remains
owned by PRM-309.

Run the focused gate with:

```sh
npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand --coverage --collectCoverageFrom=src/lib/services/promotionAdmin.js
TZ=Pacific/Kiritimati npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand
TZ=America/Los_Angeles npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand
```

## PRM-310 PostgreSQL contention and lifecycle gate

- Real PostgreSQL contention tests use separate backend transactions and prove
  exactly one reservation plus one deterministic rejection at per-user and
  global limits of one.
- The active-transaction partial unique index rejects concurrent active
  redemptions even when attempts target different promotions.
- Database-backed lifecycle tests prove `RESERVED` and `APPLIED` consume limits,
  `RELEASED` and `EXPIRED` do not, retries are idempotent, forbidden state
  changes fail, and rollback leaves no redemption or transaction attachment.
- The disposable PostgreSQL harness proves database cleanup after successful and
  failed setup, bounds stalled or throwing connection shutdown, and preserves
  retryable cleanup state after failed removal. Each failed cleanup attempt
  leaves zero tagged admin sessions, and a retry uses a fresh admin client.

## Integrated assurance boundaries

- The PRM-307 (#30), PRM-308 (#29), and PRM-310 (#32) gates above preserve
  their distinct eligibility, validation/lifecycle, and real-PostgreSQL proof.
- PRM-309 (#31) below preserves its distinct server-action and initial-page
  proof, including authentication, delegation, revalidation, and safe action
  wrapping.
- The PRM-312 UI failure/recovery and PRM-311 checkout lifecycle gates are
  merged. PRM-313 CI enforcement preserves their independent evidence.

Future assurance changes must preserve #30 eligibility evidence, #29
validation/lifecycle evidence, #31 action/page evidence, #32 PostgreSQL
contention/harness evidence, and the authoritative Project state.

## PRM-311 checkout and payment lifecycle gate

`src/lib/services/__tests__/promotionCheckoutLifecycle.postgres.test.js` uses
the same disposable PostgreSQL contract as PRM-310. It exercises real
promotion pricing, reservation, redemption, checkout finalization,
transaction-pricing, and invoice discount summaries. Stripe is represented
only by a deterministic local SDK-boundary fake; the suite cannot call Stripe
or any production service.

The suite proves:

- persisted generic evaluation through reservation, cent-accurate Stripe unit
  amount, payment reconciliation, redemption application, booking confirmation,
  immutable transaction snapshot, and invoice discount row;
- generic, personal, and automatic selection precedence while wallet-credit
  calculation remains independent;
- reservation-time rejection of stale paused/deactivated, unassigned,
  expired-window, exhausted-limit, and changed first-booking previews;
- one-time release for session creation failure/cancellation, one-time expiry,
  rollback-safe webhook worker retry, and idempotent paid reconciliation.

## Admin handoff pricing parity gate

The admin handoff uses the same promotion engine and reservation lifecycle with
a separate token-authenticated preview boundary. Focused synthetic coverage
proves:

- the server derives the customer from the current handoff transaction and
  ignores any browser `userId`;
- unverified, invalid/superseded, expired, and already-paid handoffs cannot
  obtain customer-specific pricing or create checkout;
- automatic and assigned personal selection plus generic applied, superseded,
  invalid, inactive, and minimum-spend feedback retain normal behavior;
- wallet earning stays outside the selected promotion and payable total;
- checkout revalidates token version, ownership, availability, pricing,
  assignment/eligibility, and usage reservation under the existing transaction
  lock, then keeps subtotal, snapshot, transaction, and Stripe amounts aligned;
- edited/added/duplicated/removed properties synchronize the existing booking
  set without a normal draft or duplicate transaction; failed completion
  expires an orphaned Stripe session and leaves a safe retry path.

Run:

```sh
npx jest --runInBand --runTestsByPath src/lib/services/__tests__/adminBookingHandoffs.test.js src/lib/services/__tests__/promotionPricing.test.js src/lib/services/__tests__/promotionCheckout.test.js src/app/booking/__tests__/BookNew.test.jsx 'src/app/booking/handoff/[token]/__tests__/BookingHandoffPageClient.test.jsx' 'src/app/api/booking-handoffs/[token]/promotion-preview/__tests__/route.test.js' 'src/app/api/booking-handoffs/[token]/checkout/__tests__/route.test.js'
```

With the dedicated test-admin environment configured, run:

```sh
npx jest src/lib/services/__tests__/promotionCheckoutLifecycle.postgres.test.js --runInBand --coverage --collectCoverageFrom=src/lib/services/promotionCheckout.js --collectCoverageFrom=src/lib/services/promotionPricing.js --collectCoverageFrom=src/lib/services/promotionRedemptions.js
```

## Repeatable PostgreSQL gate

The harness fails closed unless `NODE_ENV=test`, the opt-in value is exactly
`CREATE_DROP_RESERVED_DATABASES`, and every dedicated test-admin setting below
is present. The configured role must be a test-only role on a disposable test
cluster with permission to create/drop databases and terminate its own test
connections. Do not use production or shared application credentials.

- `MW_TEST_POSTGRES_ADMIN_OPT_IN`
- `MW_TEST_POSTGRES_ADMIN_HOST`
- `MW_TEST_POSTGRES_ADMIN_PORT`
- `MW_TEST_POSTGRES_ADMIN_USER`
- `MW_TEST_POSTGRES_ADMIN_PASSWORD` (optional when the test server does not use
  password authentication)
- `MW_TEST_POSTGRES_ADMIN_DATABASE` (must be `postgres`)

The cluster DDL path ignores application `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, and `DB_NAME`. It generates only names under the fixed
`mw_codex_test_` prefix and rechecks that invariant immediately before every
create, terminate, alter, or drop operation. The integration suite points the
application model connection at that generated database only after safe
creation, then restores the prior application environment after cleanup.

With the dedicated test-admin environment configured, run:

```sh
npx jest src/lib/db/testing/__tests__/disposablePostgres.test.js --runInBand
npx jest src/lib/services/__tests__/promotionRedemptions.postgres.test.js --runInBand
```

Capture redemption-service coverage with:

```sh
npx jest src/lib/services/__tests__/promotionRedemptions.postgres.test.js --runInBand --coverage --collectCoverageFrom=src/lib/services/promotionRedemptions.js
```

Both commands use synthetic identifiers and create and remove their own
database. A missing opt-in or incomplete dedicated configuration is a hard
failure; there is no fallback to application database credentials.

## Server-action and initial-page gate

`src/lib/actions/__tests__/promotions.test.js` directly covers all nine exports
from `src/lib/actions/promotions.js`. The gate proves that:

- anonymous sessions, deleted database users, and database-backed customer roles
  are rejected;
- every authorized service call receives the numeric actor ID and role from the
  authenticated database user, regardless of role-like caller input or session
  claims;
- the association module is initialized before the promotion list service uses
  assignment includes;
- each mutation delegates once and then revalidates `/admin` and
  `/admin/promotions`, while listing and customer search do not revalidate;
- successful results and service failures retain the stable `actionWrapper`
  response shape, including the generic fallback for a rejection without an
  error message.

`src/app/admin/promotions/__tests__/page.test.jsx` separately proves that a
successful catalog, a genuine empty catalog, and a safe load error are passed
to `PromotionManager` without converting a load failure into a successful empty
state.

Run the focused boundary gate with:

```sh
npx jest src/lib/actions/__tests__/promotions.test.js src/app/admin/promotions/__tests__/page.test.jsx --runInBand
```

Collect the action/page boundary coverage with:

```sh
npx jest src/lib/actions/__tests__/promotions.test.js src/app/admin/promotions/__tests__/page.test.jsx --runInBand --coverage --collectCoverageFrom=src/lib/actions/promotions.js --collectCoverageFrom=src/app/admin/promotions/page.jsx
```

The accepted minimum for `src/lib/actions/promotions.js` is 90% statements and
80% branches. The issue #31 implementation recorded 100% statements and 100%
branches for both boundary files across 26 focused tests.

All seven assurance children are merged and `DONE`. PRM-313 enforces their
focused CI coverage without implying that the repository-wide Jest baseline is
green; the parent feature's final workflow state remains authoritative in
GitHub Project 1.

## Promotions UI failure and recovery gate

`src/app/admin/promotions/__tests__/PromotionManager.test.jsx` proves that the
client preserves operator state and reports safe action results:

- A page load failure is an accessible alert with a named retry control; the
  catalog tabs and empty state are withheld until a successful page render.
- A successful empty catalog still renders the tab-specific empty state without
  an error.
- Failed and rejected create/update actions retain entered form values and do
  not alter catalog rows. A successful retry updates only the returned row and
  clears the stale alert.
- Failed or rejected lifecycle actions preserve the current status; failed
  search, assign, and unassign actions preserve current assignments and expose
  an accessible retryable error. Successful assignment changes use named status
  feedback.
- Per-operation client locks and disabled controls prevent rapid duplicate form,
  lifecycle, assignment, and unassignment submissions while a request is
  pending.

Run the focused UI/page gate with:

```sh
npx jest src/app/admin/promotions/__tests__/PromotionManager.test.jsx src/app/admin/promotions/__tests__/page.test.jsx --runInBand
```

Capture coverage with:

```sh
npx jest src/app/admin/promotions/__tests__/PromotionManager.test.jsx src/app/admin/promotions/__tests__/page.test.jsx --runInBand --coverage --collectCoverageFrom=src/app/admin/promotions/PromotionManager.jsx --collectCoverageFrom=src/app/admin/promotions/page.jsx
```

The required `PromotionManager` branch coverage is at least 80%. The initial
PRM-312 implementation recorded 85.61% branches across 19 component tests;
the paired page suite adds three page-boundary tests.

## PRM-313 GitHub CI quality gates

[`.github/workflows/promotion-quality-gates.yml`](../../.github/workflows/promotion-quality-gates.yml)
runs on every pull request to `main` and can also be started manually. It uses
`npm ci`, Node 24, dependency caching keyed by `package-lock.json`, bounded
job/process timeouts, and only safe synthetic configuration. It never caches a
database, environment file, or secret.

The blocking jobs are:

- **Promotion coverage gate** — `npm run test:promotions:coverage` executes 9
  focused suites. Its promotion-owned aggregate threshold is at least 85%
  statements and 75% branches; `src/lib/actions/promotions.js` retains its
  stronger 90% statement and 80% branch threshold.
- **Promotion PostgreSQL migration and integration gate** —
  `npm run test:promotions:postgres` runs the disposable-database harness,
  promotion schema migration contract, redemption contention suite, and
  checkout lifecycle suite against PostgreSQL 16. The following `always()`
  cleanup step runs `npm run cleanup:disposable-postgres`, which only drops
  names beginning with `mw_codex_test_`.

The non-blocking, explicitly named **Repository-wide Jest baseline
(informational)** job always runs `npm run test:jest:full` with the same
synthetic PostgreSQL service. It is informational only because the existing
unrelated PropertyCard mobile-autoscroll and OAuth expectations are not part
of promotion ownership; it does not reduce or bypass either blocking promotion
gate. On 2026-07-21, the local serial baseline with a disposable PostgreSQL
server reported 176/182 suites and 1007/1025 tests passing; the 6 failed
suites and 18 failed tests were those unrelated areas.

All CI values are test-only; the workflow does not run an environment dump or
upload any values:

- `NODE_ENV`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `MW_TEST_POSTGRES_ADMIN_OPT_IN`, `MW_TEST_POSTGRES_ADMIN_HOST`,
  `MW_TEST_POSTGRES_ADMIN_PORT`, `MW_TEST_POSTGRES_ADMIN_USER`,
  `MW_TEST_POSTGRES_ADMIN_PASSWORD`, `MW_TEST_POSTGRES_ADMIN_DATABASE`
- `JWT_SECRET`, `NEXT_PUBLIC_BASE_URL`, `STRIPE_SECRET_KEY`, and
  `STRIPE_WEBHOOK_SECRET`

`DB_*` and `MW_TEST_POSTGRES_ADMIN_*` identify only the disposable service;
the explicit opt-in is `CREATE_DROP_RESERVED_DATABASES`. JWT and Stripe values
are synthetic strings, and the hostname is loopback-only. Failure artifacts
contain only the Jest coverage directory and are retained for seven days; no
environment dump, database dump, webhook payload, or credential is uploaded.

To reproduce the blocking jobs locally, point these variables at a disposable
PostgreSQL instance (never a shared or production server), then run:

```sh
export NODE_ENV=test
export DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=milkywayy_ci DB_USER=postgres DB_PASSWORD=postgres
export MW_TEST_POSTGRES_ADMIN_OPT_IN=CREATE_DROP_RESERVED_DATABASES
export MW_TEST_POSTGRES_ADMIN_HOST=127.0.0.1 MW_TEST_POSTGRES_ADMIN_PORT=5432
export MW_TEST_POSTGRES_ADMIN_USER=postgres MW_TEST_POSTGRES_ADMIN_PASSWORD=postgres
export MW_TEST_POSTGRES_ADMIN_DATABASE=postgres
export JWT_SECRET=ci-test-only-jwt-signing-secret-not-for-production
export NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000
export STRIPE_SECRET_KEY=sk_test_ci_not_a_real_stripe_key
export STRIPE_WEBHOOK_SECRET=whsec_ci_not_a_real_webhook_secret
npm ci
npm run test:promotions:coverage
npm run test:promotions:postgres
npm run cleanup:disposable-postgres
```

The reproducible deliberate-failure proof is
`npm run test:promotions:quality-gate-proof`. It temporarily injects an
impossible 101% statement threshold into a child Jest process, asserts that
the coverage command exits nonzero, and then exits successfully without
changing tracked code. The normal coverage gate is run first and remains the
review-head result.

## Manual gates

- Compare before/after totals for every existing active promotion behavior.
- Verify a worse generic code does not remove a better personal/automatic benefit.
- Verify pause/deactivation affects new checkout only and preserves historical invoices.
- Verify system promotions cannot be physically deleted through direct requests.
- Verify usage counters and reservations under two simultaneous checkout attempts.
- Verify legacy Discounts and Coupons admin routes no longer provide an alternate write path.

## Release blockers

- Existing customer benefit is silently lost during migration.
- More than one promotion applies or wallet value disappears.
- Usage limits can be exceeded through concurrency or payment retries.
- Checkout, transaction, and invoice totals disagree.
