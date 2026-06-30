# Promotions management security test plan

- Last updated: 2026-06-30
- Release gate status: `NOT_STARTED`

## Automated gates

- Promotion CRUD and assignment permissions are enforced server-side.
- Personal customer lookup excludes staff and disabled customers.
- Codes, labels, percentages, amounts, caps, minimums, dates, priorities, and
  limits reject malformed/out-of-range input.
- Eligibility tests cover active dates, first/second booking, customer assignment,
  minimum spend, per-user limits, total limits, and disabled promotions.
- Precedence tests prove one promotion only, personal over automatic, generic
  only when strictly better, and wallet separation.
- Concurrent reservation tests cannot exceed per-user or global limits.
- Failed, expired, cancelled, and replayed payment flows release/finalize exactly once.
- Transaction and invoice calculations use the stored promotion snapshot rather
  than mutable current configuration.
- Code-validation responses do not expose private customer assignments or useful enumeration detail.

## Manual gates

- Compare before/after totals for every existing active promotion behavior.
- Verify a worse generic code does not remove a better personal/automatic benefit.
- Verify pause/deactivation affects new checkout only and preserves historical invoices.
- Verify system promotions cannot be physically deleted through direct requests.
- Verify usage counters and reservations under two simultaneous checkout attempts.

## Release blockers

- Existing customer benefit is silently lost during migration.
- More than one promotion applies or wallet value disappears.
- Usage limits can be exceeded through concurrency or payment retries.
- Checkout, transaction, and invoice totals disagree.
- The pre-existing launch-credit behavioral mismatch remains unresolved at cutover.
