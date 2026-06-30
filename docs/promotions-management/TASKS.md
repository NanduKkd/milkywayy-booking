# Promotions management task tracker

- Last updated: 2026-07-01
- Overall implementation status: `IN_PROGRESS`
- Current milestone: `M1 - Persistence and evaluation engine`

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Contract and migration mapping | `DONE` | 3 | 3 | 2-3 days |
| M1 - Persistence and evaluation engine | `IN_PROGRESS` | 4 | 5 | 5-7 days |
| M2 - Admin UI and checkout integration | `NOT_STARTED` | 0 | 5 | 6-9 days |
| M3 - Verification and rollout | `NOT_STARTED` | 0 | 5 | 4-6 days |

## M0 - Contract and migration mapping

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| PRM-001 | Approve precedence and no-stacking rules | `DONE` | Product / Engineering | None | Personal, automatic, generic, and wallet interactions match DECISIONS.md | `DECISIONS.md` accepted `PRM-D001` to `PRM-D004`, `PRM-D006`, and `PRM-D009`; `LEGACY-INVENTORY.md` records the intentional legacy stacking behavior that will be replaced at cutover. |
| PRM-002 | Inventory existing coupon, launch-credit, discount, and wallet behavior | `DONE` | Engineering | PRM-001 | Every persisted/configured behavior has a keep, migrate, or explicitly deferred disposition | Added `LEGACY-INVENTORY.md` with code-backed dispositions for generic coupons, launch credit, direct discounts, wallet-credit rules, transaction snapshots, invoice output, and admin routes. Focused verification on 2026-07-01: `bookings.test.js`, `invoice.test.js`, and `bookingWorkflow.test.js` passed; `coupons.test.js` failed on the known `LAUNCH500` manual-redemption mismatch tracked by `PRM-304`. |
| PRM-003 | Approve promotion and redemption data model | `DONE` | Engineering | PRM-002 | Generic, personal, automatic, fixed, percentage, usage, assignment, and audit requirements are represented | Updated `ARCHITECTURE.md` with the approved `promotions`, `promotion_assignments`, `promotion_redemptions`, `promotion_audit_events`, and transaction snapshot contract. Accepted `PRM-D010` to `PRM-D012` in `DECISIONS.md` to lock first-class tables, immutable transaction snapshots, and append-only audit history for the upcoming schema work. |

## M1 - Persistence and evaluation engine

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| PRM-101 | Add promotion schema and staged migrations | `DONE` | Engineering | PRM-003 | Existing transaction references remain valid and migration is reversible before cleanup | Added `20260701010000-create-promotions-core-schema.js` plus Sequelize models for promotions, assignments, redemptions, audit events, and transaction compatibility fields without removing legacy coupon or transaction references. Verification on 2026-07-01: `npm test -- src/lib/db/migrations/__tests__/20260701010000-create-promotions-core-schema.test.js` passed. |
| PRM-102 | Add promotion redemption tracking | `DONE` | Engineering | PRM-101 | Per-user and total usage are durable and concurrency safe | Added `src/lib/services/promotionRedemptions.js` to reserve, apply, release, expire, and count active promotion redemptions with promotion-row locking for limit checks. Verification on 2026-07-01: `npm test -- src/lib/services/__tests__/promotionRedemptions.test.js` passed. |
| PRM-103 | Implement pure eligibility and ranking engine | `DONE` | Engineering | PRM-001, PRM-101 | Candidate eligibility and best-benefit selection are deterministic and testable | Added `src/lib/services/promotionEngine.js` with pure benefit calculation, eligibility checks, Dubai business-date handling, and precedence selection across automatic, personal, and generic promotions. Verification on 2026-07-01: `npm test -- src/lib/services/__tests__/promotionEngine.test.js --runInBand` passed. |
| PRM-104 | Integrate transactional reservation/finalization | `DONE` | Engineering | PRM-102, PRM-103 | Concurrent checkout cannot exceed limits; failed/expired payments release reservations correctly | Added `src/lib/services/promotionCheckout.js` to attach reserved promotions and immutable snapshots to pending transactions, apply redemptions on paid checkout finalization, and release/expire reservations on failed or expired sessions. Wired the lifecycle into `bookings.js`, the Stripe webhook, and admin pending-session reconciliation. Verification on 2026-07-01: `npm test -- src/lib/services/__tests__/promotionCheckout.test.js`, `npm test -- src/lib/actions/__tests__/bookings.test.js`, `npm test -- src/app/api/admin/bookings/__tests__/route.test.js`, and `npm test -- src/app/api/webhooks/stripe/__tests__/route.test.js` passed. |
| PRM-105 | Add authorized promotion CRUD services | `DONE` | Engineering | PRM-101 | Generic, personal, and automatic rules validate and audit every mutation | Added `src/lib/services/promotionAdmin.js` with `SUPERADMIN` compatibility authorization, typed payload validation, audit-event writes for create/update/activate/pause/deactivate, and active generic-code conflict checks. Verification on 2026-07-01: `npm test -- src/lib/services/__tests__/promotionAdmin.test.js --runInBand` passed. |

## M2 - Admin UI and checkout integration

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| PRM-201 | Build three-tab Promotions admin page | `NOT_STARTED` | Engineering | PRM-105 | List, create, activate/pause, edit, and delete/deactivate flows match target design | Pending |
| PRM-202 | Add customer assignment search | `NOT_STARTED` | Engineering | PRM-105, customer API | Personal promotions can only target active customers and expose no staff accounts | Pending |
| PRM-203 | Integrate promotion evaluation into pricing and checkout | `NOT_STARTED` | Engineering | PRM-103, PRM-104 | Customer totals show one selected promotion and separate wallet credit | Pending |
| PRM-204 | Persist applied promotion on transaction and invoice | `NOT_STARTED` | Engineering | PRM-203 | Payment, transaction, booking summary, and invoice agree on identifiers and amounts | Pending |
| PRM-205 | Remove the separate Discounts navigation after parity | `NOT_STARTED` | Engineering | PRM-201 to PRM-204 | Old route is redirected or retained read-only during rollout; no capability disappears | Pending |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| PRM-301 | Add eligibility and precedence matrix tests | `NOT_STARTED` | Engineering | M2 | Generic, personal, automatic, wallet, date, amount, customer, and tie cases pass | Pending |
| PRM-302 | Add concurrency and payment lifecycle tests | `NOT_STARTED` | Engineering | PRM-104 | Limit races, retries, failed payments, expiration, and webhook replay are safe | Pending |
| PRM-303 | Add migration parity verification | `NOT_STARTED` | Engineering | PRM-101 | Existing promotion outcomes match recorded pre-migration fixtures | Pending |
| PRM-304 | Resolve the pre-existing coupon test mismatch | `NOT_STARTED` | Engineering | PRM-301 | Launch-credit tests and intended automatic behavior agree | Pending |
| PRM-305 | Roll out in compatibility phases | `NOT_STARTED` | Engineering / Operations | PRM-301 to PRM-304 | Read/write cutover, monitoring, rollback, and old-path retirement evidence are recorded | Pending |
