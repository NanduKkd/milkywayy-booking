# Admin analytics and finance operations

- Last updated: 2026-07-02

## Migration and rollout

1. Add Expense storage, audit metadata, and indexes with no UI exposure.
2. Deploy aggregation and reconciliation tests against read-only production-like data.
3. Release Dashboard/Reports APIs to Super Admin only and compare sampled totals.
4. Enable expense CRUD after permission enforcement and audit logging are live.
5. Release Reports and Dashboard views.
6. Enable CSV, Excel, and PDF exports after equivalence and load gates pass.

## Reconciliation procedure

For sampled periods, compare:

- successful transaction amounts and payment dates;
- refunds and their reporting period;
- net revenue totals and drill-down row sums;
- expense list, category totals, and soft-deleted exclusions;
- net profit and exported totals;
- service allocation plus `Unallocated` equalling net attributable revenue.

Finance approval of sampled figures is a release gate.

Run `npm run verify:finance-rollout` before release review to refresh the
tracked automated evidence in `ROLLOUT-VERIFICATION.md` and to prepare the
ignored local worksheet `docs/private/ADMIN-ANALYTICS-FINANCE-ROLLOUT.md` for
exact sampled totals, finance signoff, rollback rehearsal notes, and monitoring
confirmation.

## Monitoring

Monitor aggregation latency, database timeouts, export duration/failures, expense
mutation failures, reconciliation alerts, and unusual export volume. Use bounded
ranges and pagination to prevent expensive unbounded queries.

## Rollback

- Disable exports and expense mutations before rolling back report presentation.
- Keep Expense rows and schema during application rollback.
- Dashboard may revert to its previous link-card view independently.
- Do not delete financial records to restore an earlier application version.

Exact live database, storage, and deployment steps remain in the ignored private
production document.
