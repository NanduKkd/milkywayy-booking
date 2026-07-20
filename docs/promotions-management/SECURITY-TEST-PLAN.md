# Promotions management security test plan

- Last updated: 2026-07-20
- Release gate status: `DONE`

## Automated gates

- Promotion CRUD and assignment permissions are enforced server-side.
- Personal customer lookup excludes staff and disabled customers.
- Codes, labels, percentages, amounts, caps, minimums, dates, priorities, and
  limits reject malformed/out-of-range input.
- Table-driven `promotionAdmin` service tests independently cover create
  normalization, update merge/clear behavior, kind/code/trigger invariants,
  benefit and limit boundaries, real calendar dates and ordered ranges, status
  isolation, and boolean trigger flags.
- Active generic-code conflicts are tested case-insensitively across create,
  update, and activation. Lifecycle tests cover allowed, repeated no-op,
  forbidden, and terminal-deactivation paths.
- Assignment and unassignment tests reject wrong kinds, missing promotions or
  customers, duplicate active assignments, and missing active assignments while
  proving successful unassignment preserves the historical row.
- Eligibility tests cover active dates, first/second booking, customer assignment,
  minimum spend, per-user limits, total limits, and disabled promotions.
- Precedence tests prove one promotion only, personal over automatic, generic
  only when strictly better, and wallet separation.
- Migration parity fixtures cover preserved generic-coupon, launch-credit, and
  wallet-separation outcomes plus the accepted direct-discount non-stacking cutover.
- Concurrent reservation tests cannot exceed per-user or global limits.
- Failed, expired, cancelled, and replayed payment flows release/finalize exactly once.
- Transaction and invoice calculations use the stored promotion snapshot rather
  than mutable current configuration.
- Code-validation responses do not expose private customer assignments or useful enumeration detail.

The focused repeatable gate is:

```sh
npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand --coverage --collectCoverageFrom=src/lib/services/promotionAdmin.js
```

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
