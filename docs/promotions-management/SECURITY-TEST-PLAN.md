# Promotions management security test plan

- Last updated: 2026-07-20
- Overall release-assurance status: `IN_PROGRESS` — parent feature #28 remains
  open with validation, action-boundary, checkout, UI, and CI work outstanding.
- PRM-310 PostgreSQL contention gate: automated and in review.

## Automated gates

- Promotion CRUD and assignment permissions are enforced server-side.
- Personal customer lookup excludes staff and disabled customers.
- Codes, labels, percentages, amounts, caps, minimums, dates, priorities, and
  limits reject malformed/out-of-range input.
- Eligibility tests cover active dates, first/second booking, customer assignment,
  minimum spend, per-user limits, total limits, and disabled promotions.
- Precedence tests prove one promotion only, personal over automatic, generic
  only when strictly better, and wallet separation.
- Migration parity fixtures cover preserved generic-coupon, launch-credit, and
  wallet-separation outcomes plus the accepted direct-discount non-stacking cutover.
- Real PostgreSQL contention tests use separate backend transactions and prove
  exactly one reservation plus one deterministic rejection at per-user and
  global limits of one.
- The active-transaction partial unique index rejects concurrent active
  redemptions even when attempts target different promotions.
- Database-backed lifecycle tests prove `RESERVED` and `APPLIED` consume limits,
  `RELEASED` and `EXPIRED` do not, retries are idempotent, forbidden state
  changes fail, and rollback leaves no redemption or transaction attachment.
- The disposable PostgreSQL harness proves database cleanup after both a
  successful run and an injected setup failure, bounds stalled or throwing
  connection shutdown, and retries a failed database removal without losing
  cleanup state. Each failed cleanup attempt leaves zero admin sessions and a
  retry uses a newly connected admin client.
- Failed, expired, cancelled, and replayed payment flows release/finalize exactly once.
- Transaction and invoice calculations use the stored promotion snapshot rather
  than mutable current configuration.
- Code-validation responses do not expose private customer assignments or useful enumeration detail.

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
