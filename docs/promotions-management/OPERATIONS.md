# Promotions management operations

- Last updated: 2026-07-20

## Compatibility rollout

1. Inventory and fixture current coupon, system launch-credit, dynamic discount,
   wallet-credit, checkout, transaction, and invoice behavior. See
   [LEGACY-INVENTORY.md](./LEGACY-INVENTORY.md).
2. Add new promotion/redemption schema and transaction references.
3. Backfill legacy data while old reads/writes remain authoritative.
4. Run the new evaluator in shadow mode and record outcome differences without
   changing customer totals.
5. Resolve parity differences and enable dual-write where required.
6. Cut checkout evaluation to the new engine behind a reversible gate.
7. Release the consolidated admin UI and redirect the old Discounts route.
8. Stop legacy writes only after payment, invoice, and rollback gates pass.

Destructive legacy schema cleanup is a later operation, not part of initial
cutover.

## Reconciliation

- Compare legacy and new eligibility for representative customers and carts.
- Verify fixed, percentage, cap, minimum, active dates, usage limits, system
  launch credit, direct discount, wallet-credit, and ordering behavior.
- Confirm transaction/invoice snapshots explain the exact applied amount.
- Confirm wallet deduction remains separate before and after cutover.

## Monitoring

Monitor evaluator differences, rejected codes, redemption reservations,
reservation expiry, usage-limit conflicts, checkout total changes, webhook
finalization failures, and customer support reports.

## Admin mutation rejection handling

- Correct malformed promotion fields in the Promotions form; invalid calendar
  dates, unsupported timestamp forms, and reversed eligibility/trigger windows
  are rejected before a write. Date-only and offset-free admin values are UTC;
  explicit `Z` or `±HH:mm` offsets are normalized to UTC.
- A draft may be created initially paused or paused through the lifecycle
  action before activation. Repeating the action for the current status is
  safe, while a deactivated promotion cannot return to service.
- A duplicate personal assignment is rejected rather than reported as a new
  success. Unassignment requires both the active assignment and its customer to
  resolve, and a rejection leaves assignment history unchanged.
- Known race-time unique conflicts use the same stable active-code or duplicate
  assignment message as preflight rejection. Treat these messages as operator
  guidance. Other database errors, private assignment details, and account
  internals must not be surfaced to the client.

## Current cutover state

- Checkout pricing, reservation, transaction snapshotting, and invoice
  rendering now read from the promotions engine.
- Legacy Discounts and Coupons admin routes redirect to
  `/admin/promotions` for operator traffic.
- Legacy coupon mutation actions are blocked server-side so generic-code
  writes only happen through Promotions.
- Legacy coupon validation reads remain available for compatibility until
  destructive cleanup is scheduled.

## Rollback

- Disable new evaluation and return reads to legacy behavior while dual data remains.
- Release outstanding reservations safely without deleting applied history.
- Keep new transaction references and backfilled rows during application rollback.
- Do not re-enable old writes after cleanup unless compatibility is verified.
- If rollback is required before destructive cleanup, keep `/admin/promotions`
  as the only write surface and use transaction snapshots plus parity fixtures
  to verify any temporary legacy read restoration.

Exact production flags, provider configuration, and operator commands belong in
the ignored private production document.
