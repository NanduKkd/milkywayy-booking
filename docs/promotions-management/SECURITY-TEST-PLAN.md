# Promotions management security test plan

- Last updated: 2026-07-20
- Core promotions release gate status: `DONE`
- Test-assurance Project snapshot (2026-07-20):
  - parent feature #28: `DRAFT`
  - authorized child tasks PRM-307 (#30), PRM-308 (#29), PRM-309 (#31),
    and PRM-310 (#32): `IN REVIEW`

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
- Concurrent reservation tests cannot exceed per-user or global limits.
- Failed, expired, cancelled, and replayed payment flows release/finalize exactly once.
- Transaction and invoice calculations use the stored promotion snapshot rather
  than mutable current configuration.
- Code-validation responses do not expose private customer assignments or useful enumeration detail.

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

The parent assurance feature remains in `DRAFT`; the four authorized child
tasks above are in review, not complete. Further checkout lifecycle, UI
failure/recovery, and CI enforcement work remains draft and dependency-gated.
Focused boundary results do not imply that the repository-wide Jest baseline is
green.

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
