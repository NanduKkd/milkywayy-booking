# Promotions management security test plan

- Last updated: 2026-07-20
- Test-assurance Project snapshot (2026-07-20):
  - parent feature #28: `DRAFT`
  - authorized child tasks PRM-307 (#30), PRM-308 (#29), PRM-309 (#31),
    and PRM-310 (#32): `IN_REVIEW`
  - successor tasks PRM-312 (#33), PRM-311 (#34), and PRM-313 (#35):
    `DRAFT` and dependency-gated

These statuses describe work under review, not completed or merged assurance.
Each child branch owns separate proof and the parent remains open.

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

These are mocked service-boundary unit tests. They do not claim real database
contention, action/page coverage, or disabled-customer enforcement.

Run the focused gate with:

```sh
npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand --coverage --collectCoverageFrom=src/lib/services/promotionAdmin.js
TZ=Pacific/Kiritimati npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand
TZ=America/Los_Angeles npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand
```

## Sibling assurance boundaries

- PRM-307 (#30) separately owns disabled-customer search and direct-assignment
  enforcement. This branch does not claim that open sibling change as complete.
- PRM-309 (#31) separately owns direct server-action and initial-page boundary
  proof, including authentication, delegation, revalidation, and safe action
  wrapping.
- PRM-310 (#32) separately owns disposable real-PostgreSQL reservation,
  lifecycle, and contention proof. Existing mocked redemption tests must not be
  described as that database-backed gate.
- Checkout lifecycle, UI failure/recovery, and CI enforcement remain draft and
  dependency-gated under #34, #33, and #35 respectively.

When sibling pull requests are integrated, reconciliation of this shared file
must preserve #30 eligibility evidence, #29 validation/lifecycle evidence, #31
action/page evidence, #32 PostgreSQL contention/harness evidence, and the
authoritative Project snapshot above.

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
