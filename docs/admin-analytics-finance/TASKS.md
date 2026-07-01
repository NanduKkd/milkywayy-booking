# Admin analytics and finance task tracker

- Last updated: 2026-07-01
- Overall implementation status: `IN_PROGRESS`
- Current milestone: `M2 - Reports and exports`

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Metric and report contract | `DONE` | 3 | 3 | 2-3 days |
| M1 - Expense and analytics foundation | `DONE` | 5 | 5 | 4-6 days |
| M2 - Reports and exports | `IN_PROGRESS` | 2 | 6 | 7-10 days |
| M3 - Verification and rollout | `NOT_STARTED` | 0 | 5 | 4-5 days |

## M0 - Metric and report contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| FIN-001 | Approve revenue and refund recognition rules | `DONE` | Product / Engineering | None | Net successful payments by `paidAt`, less refunds, is the authoritative revenue basis | `DECISIONS.md` now records `FIN-D001` and `FIN-D010`, locking cash reporting to successful payments by `paidAt` and refund recognition by refund occurrence date in Dubai business time. |
| FIN-002 | Define every dashboard and report metric | `DONE` | Engineering | FIN-001 | Formula, source fields, timezone, filters, and empty behavior are documented | `ARCHITECTURE.md` now defines common reporting semantics plus Dashboard and Financial Report metric contracts covering formulas, source fields, filter expectations, comparison behavior, and empty-state handling. |
| FIN-003 | Define report and export filter contract | `DONE` | Engineering | FIN-002 | Screen, drill-down, CSV, Excel, and PDF use identical validated filters | `ARCHITECTURE.md` now defines the canonical filter fields, normalization rules, per-surface overlays, and export-equivalence requirements, while `DECISIONS.md` records `FIN-D011` to lock all analytics surfaces onto the same validated contract. |

## M1 - Expense and analytics foundation

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| FIN-101 | Add Expense model, migration, associations, and indexes | `DONE` | Engineering | FIN-002 | Required v1 fields, creator/updater, soft-delete timestamps, and useful date/category indexes exist | Added `Expense` Sequelize model and user associations, plus migration `20260701120000-create-expenses.js` with active date/category indexes and soft-delete audit constraints. Verified with `npx jest src/lib/db/models/__tests__/expense.test.js src/lib/db/migrations/__tests__/20260701120000-create-expenses.test.js --runInBand`. |
| FIN-102 | Implement authorized expense CRUD | `DONE` | Engineering | FIN-101, permission service | Create, update, list, and soft delete validate all inputs and produce audit events | Added `src/lib/services/expenseAdmin.js` with `SUPERADMIN` compatibility authorization, validated category/date/amount rules, soft deletion, and audit-event writes; added admin expense API routes plus `ExpenseAuditEvent` model/migration coverage. Verified on 2026-07-01 with `npx jest src/lib/services/__tests__/expenseAdmin.test.js src/app/api/admin/expenses/__tests__/route.test.js 'src/app/api/admin/expenses/\\[id\\]/__tests__/route.test.js' src/lib/db/models/__tests__/expense.test.js src/lib/db/models/__tests__/expenseauditevent.test.js src/lib/db/migrations/__tests__/20260701120000-create-expenses.test.js src/lib/db/migrations/__tests__/20260701130000-create-expense-audit-events.test.js --runInBand`. |
| FIN-103 | Implement shared financial aggregation service | `DONE` | Engineering | FIN-002 | A framework-light service computes net revenue, expenses, profit, booking counts, averages, and service splits | Added `src/lib/services/financialAggregation.js` with Dubai-normalized range handling plus shared metric aggregation over bookings, transactions, and expenses. Verified with `npx jest src/lib/services/__tests__/financialAggregation.test.js --runInBand`. |
| FIN-104 | Add bounded Dashboard analytics API | `DONE` | Engineering | FIN-103 | Valid date ranges return KPIs, trends, service splits, schedule, recent bookings, and comparisons | Added shared Dashboard analytics shaping to `src/lib/services/financialAggregation.js` and exposed `GET /api/admin/analytics/dashboard` with `SUPERADMIN` authorization, bounded range validation, KPI comparisons, revenue trend buckets, schedule summaries, and recent bookings. Verified on 2026-07-01 with `npx jest src/lib/services/__tests__/financialAggregation.test.js src/app/api/admin/analytics/dashboard/__tests__/route.test.js --runInBand`. |
| FIN-105 | Add financial drill-down API | `DONE` | Engineering | FIN-103 | Drill-down rows reconcile exactly to aggregate totals and support pagination | Added shared `buildFinancialDrilldown` and `normalizeFinancialDrilldownFilters` support in `src/lib/services/financialAggregation.js`, plus `GET /api/admin/analytics/drill-down` with `SUPERADMIN` authorization, canonical filter validation, pagination, stable sorting, and per-metric totals across payment, refund, booking, expense, service-revenue, and schedule domains. Verified on 2026-07-01 with `npx jest src/lib/services/__tests__/financialAggregation.test.js src/app/api/admin/analytics/dashboard/__tests__/route.test.js src/app/api/admin/analytics/drill-down/__tests__/route.test.js --runInBand`. |

## M2 - Reports and exports

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| FIN-201 | Build Financial Reports UI | `DONE` | Engineering | FIN-103 | KPI, chart, monthly comparison, P&L, loading, empty, and error states use live data | Added `buildFinancialReports` and `normalizeFinancialReportFilters` to `src/lib/services/financialAggregation.js`, exposed `GET /api/admin/analytics/reports`, and shipped the live `/admin/analytics` Financial Reports page with month filtering, KPI cards, weekly and six-month charts, monthly comparison, P&L, booking-status/service breakdowns, plus loading, empty, and error states. Verified on 2026-07-01 with `npx jest src/lib/services/__tests__/financialAggregation.test.js src/app/api/admin/analytics/reports/__tests__/route.test.js src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx src/components/admin/__tests__/AdminSidebarNav.test.jsx src/app/admin/__tests__/page.test.jsx --runInBand`. |
| FIN-202 | Build expense tracker UI | `DONE` | Engineering | FIN-102 | Month filtering, category breakdown, add/edit/delete, totals, and confirmations work | Added a live expense tracker to `src/app/admin/analytics/` with month-scoped expense loading, category totals, create/edit dialogs, soft-delete confirmation with required reason, and live refresh back into finance KPIs. Verified on 2026-07-01 with `npx jest src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx --runInBand`. |
| FIN-203 | Implement CSV export | `NOT_STARTED` | Engineering | FIN-003, FIN-103 | Export uses authorized server data and reconciles to screen totals | Pending |
| FIN-204 | Implement Excel export | `NOT_STARTED` | Engineering | FIN-003, FIN-103 | Workbook has stable columns, types, filters, totals, and safe cell values | Pending |
| FIN-205 | Implement PDF report export | `NOT_STARTED` | Engineering | FIN-003, FIN-103 | PDF is readable, dated, filter-labelled, and reconciles to screen totals | Pending |
| FIN-206 | Implement Dashboard drill-downs and export control | `NOT_STARTED` | Engineering | FIN-104, FIN-105 | KPI drill-down and Dashboard export respect the active date range | Pending |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| FIN-301 | Add calculation and reconciliation tests | `NOT_STARTED` | Engineering | M2 | Payment, refund, pending, failed, cancelled, cross-month, and no-data cases pass | Pending |
| FIN-302 | Add expense authorization and audit tests | `NOT_STARTED` | Engineering | FIN-102 | Unauthorized and invalid mutations fail; soft deletion and audit evidence are correct | Pending |
| FIN-303 | Add export equivalence and injection-safety tests | `NOT_STARTED` | Engineering | FIN-203 to FIN-205 | Export totals match APIs and spreadsheet-formula injection is neutralized | Pending |
| FIN-304 | Run migration and production-like volume checks | `NOT_STARTED` | Engineering | FIN-301 | Queries use indexes and meet agreed response limits on representative data | Pending |
| FIN-305 | Roll out and reconcile initial figures | `NOT_STARTED` | Engineering / Finance / Operations | FIN-301 to FIN-304 | Finance signs off sampled totals; rollback and monitoring evidence is recorded | Pending |
