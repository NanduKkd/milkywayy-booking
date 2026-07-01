# Admin analytics and finance rollout verification

- Last updated: 2026-07-02
- Verification status: `IN_PROGRESS`

## Automated release evidence

- Command: `npm run verify:finance-rollout`
- Result: Passed 64 tests across 12 suites with no skipped or todo release-blocking cases.
- Exact sampled totals, finance signoff notes, operator names, deployment timing, and rollback rehearsal details remain in the ignored private worksheet at `docs/private/ADMIN-ANALYTICS-FINANCE-ROLLOUT.md`.

| Task | Verification group | Suites | Tests | Coverage |
|---|---|---:|---:|---|
| FIN-301 | Calculation and reconciliation coverage | 1 | 18 | Shared aggregation totals stay reconciled across dashboard, reports, and drill-down analytics. |
| FIN-302 | Expense authorization and audit coverage | 3 | 15 | Expense authorization, validation, soft deletion, and audit evidence remain enforced. |
| FIN-303 | Export equivalence and output safety coverage | 3 | 19 | CSV, Excel, and PDF exports reconcile to report APIs and neutralize spreadsheet injection input. |
| FIN-304 | Volume, indexes, and bounded-query coverage | 5 | 12 | Bounded finance data loading, query windows, and representative volume gates stay in place. |

## Manual rollout checklist

- Reconcile at least one normal month, one refund month, one empty month, and one boundary month using the private worksheet.
- Record dashboard, reports, drill-down, and export totals for each sampled range in the private worksheet rather than in tracked docs.
- Capture finance signoff, rollback rehearsal notes, and monitoring confirmation in the private worksheet before marking `FIN-305` `DONE`.

## Notes

- This tracked report intentionally avoids storing live business totals or operator-specific production details.
- Re-run `npm run verify:finance-rollout` before release review to refresh automated evidence after any finance analytics change.
