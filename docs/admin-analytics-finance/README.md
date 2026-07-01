# Admin analytics and finance delivery plan

- Last updated: 2026-07-02
- Planning status: `DONE`
- Implementation status: `IN_PROGRESS`
- Target: deliver accurate Dashboard analytics, financial reports, exports, and first-release expense tracking.

## Purpose

Replace prototype mock financial data with documented server-side calculations
over bookings, transactions, refunds, and persisted expenses.

## Document index

- [TASKS.md](./TASKS.md): authoritative tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): metrics, query, export, and expense design.
- [DECISIONS.md](./DECISIONS.md): accounting definitions and deferred scope.
- [OPERATIONS.md](./OPERATIONS.md): migrations, rollout, monitoring, and recovery.
- [ROLLOUT-VERIFICATION.md](./ROLLOUT-VERIFICATION.md): tracked automated rollout evidence and the handoff to private reconciliation records.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): financial-data release gates.

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

- Dashboard KPIs, month-over-month comparisons, revenue trends, revenue by service, schedule summary, recent bookings, and drill-downs.
- Financial Reports with monthly KPIs, weekly and six-month charts, booking status, service revenue, monthly comparison, and P&L.
- Net revenue calculated from successful payments by payment date, less refunds.
- Expense CRUD with date, category, description, and amount; deletes are soft deletes.
- Profit calculated as net revenue less persisted expenses.
- CSV, Excel, and PDF exports generated from the same filtered server-side report dataset.
- Server-side date-range validation, pagination where required, and auditable mutations.

## Explicit non-goals

- Expense receipts, vendors, VAT/tax accounting, recurring expenses, approvals, or external accounting integrations.
- General-ledger or accrual accounting.
- Treating completed booking value as recognized revenue.
- Hard-coded comparison claims such as “up versus last year” without source data.

## Dependencies

- Existing booking, transaction, refund, user, and pricing data.
- `admin-access-control` for analytics, reports, exports, and expense permissions.
- `admin-panel-ui-refresh` for Dashboard presentation.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Metric and report contract | 2-3 engineering days |
| M1 - Expense and analytics foundation | 4-6 engineering days |
| M2 - Reports, drill-downs, and exports | 7-10 engineering days |
| M3 - Reconciliation, security, and rollout | 4-5 engineering days |

## Completion definition

- Every displayed and exported metric has one documented formula and date basis.
- Dashboard and Reports return matching figures for identical filters.
- Expense mutations are authorized, validated, auditable, and reversible through soft deletion.
- Reconciliation tests cover payments, refunds, cancellations, pending transactions, and time boundaries.
- Exports contain the same filters and totals as the on-screen report.
