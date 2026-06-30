# Admin customer management operations

- Last updated: 2026-06-30

## Migration and rollout

1. Add customer account-state fields with existing accounts active by default.
2. Add indexes required for customer-only queries and lifecycle checks.
3. Deploy customer aggregate queries in read-only comparison mode.
4. Switch Users to the customer-only API and verify staff exclusion and totals.
5. Enable edit, deactivate, and reactivate actions after access-path enforcement is live.

The role migration itself is coordinated by `admin-access-control`; Users must
support both compatibility and final role sets until that rollout completes.

## Pre-release checks

- Count customers directly and through the new API; confirm all staff roles are excluded.
- Reconcile sampled booking counts and net spend with booking/transaction records.
- Test pagination and sorting with ties, null names, zero bookings, and refunded transactions.
- Deactivate a test customer with active session and OAuth access and verify every access path.
- Reactivate and verify only intended access is restored.

## Monitoring

Monitor customer-list latency, failed lifecycle mutations, disabled-account
access attempts, aggregate mismatches, and unexpected staff rows in customer
queries. Any staff exposure is treated as a release incident.

## Rollback

- Disable lifecycle mutations before reverting enforcement code.
- Retain account-state fields and audit history.
- Revert the Users presentation independently while keeping customer-only server scoping.
- Never restore access by deleting disable/audit records manually through the UI.
