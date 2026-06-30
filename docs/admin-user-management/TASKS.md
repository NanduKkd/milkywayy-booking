# Admin customer management task tracker

- Last updated: 2026-06-30
- Overall implementation status: `NOT_STARTED`
- Current milestone: `M0 - Customer-management contract`

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Customer-management contract | `IN_PROGRESS` | 0 | 2 | 1-2 days |
| M1 - Account state and aggregate APIs | `NOT_STARTED` | 0 | 4 | 3-4 days |
| M2 - Users UI and lifecycle actions | `NOT_STARTED` | 0 | 4 | 3-5 days |
| M3 - Verification and rollout | `NOT_STARTED` | 0 | 4 | 2-3 days |

## M0 - Customer-management contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-001 | Approve customer-only scope and deactivation policy | `IN_REVIEW` | Product / Engineering | None | Staff exclusion and no-hard-delete policy are accepted | Pending |
| USR-002 | Define customer spend, booking count, and sort semantics | `NOT_STARTED` | Engineering | USR-001, finance metric contract | Aggregates define statuses, refunds, ties, nulls, and timezone behavior | Pending |

## M1 - Account state and aggregate APIs

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-101 | Add account activation state and migration | `NOT_STARTED` | Engineering | USR-001 | User records can be disabled/reactivated with actor, reason, and timestamps while history remains intact | Pending |
| USR-102 | Enforce deactivation across access paths | `NOT_STARTED` | Engineering | USR-101 | OTP, session, dashboard, booking, API, and OAuth access reject disabled customers | Pending |
| USR-103 | Build customer-only aggregate query service | `NOT_STARTED` | Engineering | USR-002 | Queries exclude every staff role and return reconciled booking/net-spend aggregates | Pending |
| USR-104 | Add authorized customer list and mutation APIs | `NOT_STARTED` | Engineering | USR-102, USR-103, permission service | Pagination, sorting, filtering, edit, disable, and reactivate are validated and authorized | Pending |

## M2 - Users UI and lifecycle actions

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-201 | Build customer KPI cards and table | `NOT_STARTED` | Engineering | USR-103 | Total customers, bookings, net revenue, and row data use live aggregates | Pending |
| USR-202 | Add server-driven sorting, filtering, and pagination | `NOT_STARTED` | Engineering | USR-104 | URL state is stable and large datasets are not loaded into the browser | Pending |
| USR-203 | Implement customer create and edit flows | `NOT_STARTED` | Engineering | USR-104 | Validation preserves existing account, company, billing, and contact fields | Pending |
| USR-204 | Implement deactivate/reactivate controls | `NOT_STARTED` | Engineering | USR-104 | Confirmation, reason, state feedback, and audit evidence are present | Pending |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-301 | Add staff-exclusion and aggregate tests | `NOT_STARTED` | Engineering | M2 | All staff roles are excluded and sampled totals reconcile | Pending |
| USR-302 | Add deactivation access-control tests | `NOT_STARTED` | Engineering | USR-102 | Existing sessions, OTP, dashboard, booking, API, and OAuth paths are denied after deactivation | Pending |
| USR-303 | Add PII authorization and validation tests | `NOT_STARTED` | Engineering | USR-104 | Unauthorized reads/mutations and unsafe input fail without PII leakage | Pending |
| USR-304 | Roll out account-state migration and UI | `NOT_STARTED` | Engineering / Operations | USR-301 to USR-303 | Migration, smoke tests, monitoring, and rollback evidence are recorded | Pending |
