# Promotions management security test plan

- Last updated: 2026-07-20
- Release gate status: `DONE`

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
  successful run and an injected setup failure.
- Failed, expired, cancelled, and replayed payment flows release/finalize exactly once.
- Transaction and invoice calculations use the stored promotion snapshot rather
  than mutable current configuration.
- Code-validation responses do not expose private customer assignments or useful enumeration detail.

## Repeatable PostgreSQL gate

Run the service integration suite against a local disposable PostgreSQL server:

```sh
npx jest src/lib/services/__tests__/promotionRedemptions.postgres.test.js --runInBand
```

Capture redemption-service coverage with:

```sh
npx jest src/lib/services/__tests__/promotionRedemptions.postgres.test.js --runInBand --coverage --collectCoverageFrom=src/lib/services/promotionRedemptions.js
```

Both commands use synthetic identifiers and create and remove their own
database. They must never point `DB_NAME` at a live application database.

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
