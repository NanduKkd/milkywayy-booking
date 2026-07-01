# Promotions management delivery plan

- Last updated: 2026-07-01
- Planning status: `DONE`
- Implementation status: `DONE`
- Target: consolidate generic coupons, personal customer promotions, and automatic rules without losing current discount or wallet behavior.

## Purpose

Replace the split Coupons and Discounts administration experience with one
promotion-management surface and one deterministic eligibility engine.

## Document index

- [TASKS.md](./TASKS.md): authoritative tracker.
- [LEGACY-INVENTORY.md](./LEGACY-INVENTORY.md): current coupon, launch-credit, discount, wallet, and invoice behavior to preserve or intentionally replace.
- [MIGRATION-PARITY-FIXTURES.md](./MIGRATION-PARITY-FIXTURES.md): recorded representative before/after promotion outcomes used for parity verification.
- [ARCHITECTURE.md](./ARCHITECTURE.md): promotion model, evaluation, redemption, and migration.
- [DECISIONS.md](./DECISIONS.md): precedence, stacking, and compatibility decisions.
- [OPERATIONS.md](./OPERATIONS.md): migration, rollout, and rollback.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): abuse, race, and payment gates.

## Status model

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | A dependency or decision prevents progress. |
| `IN_REVIEW` | Work awaits verification. |
| `DONE` | Acceptance criteria and evidence are complete. |
| `DEFERRED` | Removed from this release. |

## Initial scope

- One admin page with Generic Codes, Personal Auto-Apply, and Automatic Discounts tabs.
- Fixed-amount and percentage benefits with optional maximum caps and minimum spend.
- Per-user and total usage limits with durable redemption tracking.
- Personal customer assignment and automatic first-booking, second-booking, date-range, and any-booking rules.
- Deterministic precedence: personal, automatic, and generic candidates are compared; one best promotion applies; wallet remains separate.
- Migration and compatibility for existing coupons, system launch credit, direct discounts, wallet-credit discounts, ordering, and active state.
- Checkout and invoice metadata that identifies the applied promotion and amount.

## Explicit non-goals

- Stacking multiple promotions on one booking.
- Marketing campaigns, referral programs, affiliate payouts, or bulk coupon generation.
- Removing wallet balances or wallet transaction history.

## Dependencies

- Existing booking pricing, checkout, transaction, coupon, discount-config, and wallet logic.
- `admin-access-control` for promotion view and mutation permissions.
- `admin-user-management` customer lookup for personal promotion assignment.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Promotion contract and migration mapping | 2-3 engineering days |
| M1 - Persistence and evaluation engine | 5-7 engineering days |
| M2 - Admin UI and checkout integration | 6-9 engineering days |
| M3 - Payment, abuse, migration, and rollout verification | 4-6 engineering days |

## Completion definition

- Existing active benefits remain behaviorally equivalent after migration.
- Exactly one promotion is selected by a documented deterministic algorithm.
- Usage limits remain correct under concurrent checkout attempts.
- Wallet credit remains independent and does not disappear.
- Admin UI, checkout totals, transaction metadata, and invoices agree on the applied benefit.
