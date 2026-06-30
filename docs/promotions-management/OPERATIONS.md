# Promotions management operations

- Last updated: 2026-06-30

## Compatibility rollout

1. Inventory and fixture current coupon, system launch-credit, dynamic discount,
   wallet-credit, checkout, transaction, and invoice behavior.
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

## Rollback

- Disable new evaluation and return reads to legacy behavior while dual data remains.
- Release outstanding reservations safely without deleting applied history.
- Keep new transaction references and backfilled rows during application rollback.
- Do not re-enable old writes after cleanup unless compatibility is verified.

Exact production flags, provider configuration, and operator commands belong in
the ignored private production document.
