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

## Checkout reconciliation

Checkout previews are not payment authority. The reservation transaction
rechecks eligibility immediately before it writes the redemption and immutable
transaction snapshot. A paused/deactivated promotion, removed personal
assignment, expired window, consumed limit, or changed booking trigger rejects
the checkout before a Stripe session is created.

For a paid Stripe session, reconciliation applies the reserved redemption,
marks the transaction successful, and confirms its draft bookings atomically.
Retrying an already successful session is a no-op for those customer-visible
effects. If a reservation has expired, record it as `EXPIRED` and investigate
the pending payment rather than silently applying a stale benefit.

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

## Admin UI failure recovery

- If the Promotions catalog fails to load, the page shows the safe server
  message and a **Retry loading promotions** control instead of a successful
  empty catalog. Retry after the underlying access or service condition is
  resolved.
- Form validation or mutation rejection leaves the create/edit dialog and its
  entered values open. Correct the safe message's indicated field or retry the
  same operation; rows change only after a successful response.
- Lifecycle and assignment rejections leave the existing status and assignment
  rows intact. Operators may retry the named action once the temporary failure
  is resolved; successful assignment changes announce status feedback.
- While a create, update, lifecycle, assignment, or unassignment request is in
  flight, its matching control is disabled. Do not work around that protection
  with parallel browser tabs, because server-side authorization and validation
  remain authoritative.

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
