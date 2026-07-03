# Admin customer management task tracker

- Last updated: 2026-07-03
- Overall implementation status: `DEFERRED`
- Current milestone: `DEFERRED`

## Hold status

This feature has been put on hold and deferred to a later release.
Leave all implementation tasks in `DEFERRED` until work is explicitly resumed.

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Customer-management contract | `DEFERRED` | 0 | 2 | 1-2 days |
| M1 - Account state and aggregate APIs | `DEFERRED` | 0 | 4 | 3-4 days |
| M2 - Users UI and lifecycle actions | `DEFERRED` | 0 | 4 | 3-5 days |
| M3 - Verification and rollout | `DEFERRED` | 0 | 4 | 2-3 days |

## M0 - Customer-management contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-001 | Approve customer-only scope and deactivation policy | `DEFERRED` | Product / Engineering | None | Staff exclusion and no-hard-delete policy are accepted | Deferred on 2026-07-03; feature put on hold |
| USR-002 | Define customer spend, booking count, and sort semantics | `DEFERRED` | Engineering | USR-001, finance metric contract | Aggregates define statuses, refunds, ties, nulls, and timezone behavior | Deferred on 2026-07-03; feature put on hold |

## M1 - Account state and aggregate APIs

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-101 | Add account activation state and migration | `DEFERRED` | Engineering | USR-001 | User records can be disabled/reactivated with actor, reason, and timestamps while history remains intact | Deferred on 2026-07-03; feature put on hold |
| USR-102 | Enforce deactivation across access paths | `DEFERRED` | Engineering | USR-101 | OTP, session, dashboard, booking, API, and OAuth access reject disabled customers | Deferred on 2026-07-03; feature put on hold |
| USR-103 | Build customer-only aggregate query service | `DEFERRED` | Engineering | USR-002 | Queries exclude every staff role and return reconciled booking/net-spend aggregates | Deferred on 2026-07-03; feature put on hold |
| USR-104 | Add authorized customer list and mutation APIs | `DEFERRED` | Engineering | USR-102, USR-103, permission service | Pagination, sorting, filtering, edit, disable, and reactivate are validated and authorized | Deferred on 2026-07-03; feature put on hold |

## M2 - Users UI and lifecycle actions

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-201 | Build customer KPI cards and table | `DEFERRED` | Engineering | USR-103 | Total customers, bookings, net revenue, and row data use live aggregates | Deferred on 2026-07-03; feature put on hold |
| USR-202 | Add server-driven sorting, filtering, and pagination | `DEFERRED` | Engineering | USR-104 | URL state is stable and large datasets are not loaded into the browser | Deferred on 2026-07-03; feature put on hold |
| USR-203 | Implement customer create and edit flows | `DEFERRED` | Engineering | USR-104 | Validation preserves existing account, company, billing, and contact fields | Deferred on 2026-07-03; feature put on hold |
| USR-204 | Implement deactivate/reactivate controls | `DEFERRED` | Engineering | USR-104 | Confirmation, reason, state feedback, and audit evidence are present | Deferred on 2026-07-03; feature put on hold |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-301 | Add staff-exclusion and aggregate tests | `DEFERRED` | Engineering | M2 | All staff roles are excluded and sampled totals reconcile | Deferred on 2026-07-03; feature put on hold |
| USR-302 | Add deactivation access-control tests | `DEFERRED` | Engineering | USR-102 | Existing sessions, OTP, dashboard, booking, API, and OAuth paths are denied after deactivation | Deferred on 2026-07-03; feature put on hold |
| USR-303 | Add PII authorization and validation tests | `DEFERRED` | Engineering | USR-104 | Unauthorized reads/mutations and unsafe input fail without PII leakage | Deferred on 2026-07-03; feature put on hold |
| USR-304 | Roll out account-state migration and UI | `DEFERRED` | Engineering / Operations | USR-301 to USR-303 | Migration, smoke tests, monitoring, and rollback evidence are recorded | Deferred on 2026-07-03; feature put on hold |
