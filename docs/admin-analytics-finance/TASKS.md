# Admin analytics and finance task tracker

- Last updated: 2026-07-01
- Overall implementation status: `IN_PROGRESS`
- Current milestone: `M1 - Expense and analytics foundation`

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Metric and report contract | `DONE` | 3 | 3 | 2-3 days |
| M1 - Expense and analytics foundation | `NOT_STARTED` | 0 | 5 | 4-6 days |
| M2 - Reports and exports | `NOT_STARTED` | 0 | 6 | 7-10 days |
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
| FIN-101 | Add Expense model, migration, associations, and indexes | `NOT_STARTED` | Engineering | FIN-002 | Required v1 fields, creator/updater, soft-delete timestamps, and useful date/category indexes exist | Pending |
| FIN-102 | Implement authorized expense CRUD | `NOT_STARTED` | Engineering | FIN-101, permission service | Create, update, list, and soft delete validate all inputs and produce audit events | Pending |
| FIN-103 | Implement shared financial aggregation service | `NOT_STARTED` | Engineering | FIN-002 | A framework-light service computes net revenue, expenses, profit, booking counts, averages, and service splits | Pending |
| FIN-104 | Add bounded Dashboard analytics API | `NOT_STARTED` | Engineering | FIN-103 | Valid date ranges return KPIs, trends, service splits, schedule, recent bookings, and comparisons | Pending |
| FIN-105 | Add financial drill-down API | `NOT_STARTED` | Engineering | FIN-103 | Drill-down rows reconcile exactly to aggregate totals and support pagination | Pending |

## M2 - Reports and exports

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| FIN-201 | Build Financial Reports UI | `NOT_STARTED` | Engineering | FIN-103 | KPI, chart, monthly comparison, P&L, loading, empty, and error states use live data | Pending |
| FIN-202 | Build expense tracker UI | `NOT_STARTED` | Engineering | FIN-102 | Month filtering, category breakdown, add/edit/delete, totals, and confirmations work | Pending |
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
