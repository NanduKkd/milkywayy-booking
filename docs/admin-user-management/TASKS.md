# Admin customer management task tracker

> Historical delivery ledger. GitHub Issues and Project 1 are authoritative for current work and status. This file preserves migration evidence and must not be used for dispatch.

- Last updated: 2026-07-12
- Overall implementation status: `DEFERRED`
- Current milestone: `DEFERRED`

## Hold status

This feature has been put on hold and deferred to a later release.
The customer lifecycle slice (`USR-101`, `USR-102`, and `USR-204`) was resumed
and completed on 2026-07-12. All unrelated implementation tasks remain
`DEFERRED`.

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Customer-management contract | `DEFERRED` | 1 | 2 | 1-2 days |
| M1 - Account state and aggregate APIs | `DEFERRED` | 2 | 4 | 3-4 days |
| M2 - Users UI and lifecycle actions | `DEFERRED` | 1 | 4 | 3-5 days |
| M3 - Verification and rollout | `DEFERRED` | 0 | 4 | 2-3 days |

## M0 - Customer-management contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-001 | Approve customer-only scope and deactivation policy | `DONE` | Product / Engineering | None | Staff exclusion, no-hard-delete policy, no Edit action, and reversible confirmed Disable/Enable behavior are accepted | Project owner confirmed the no-Edit, customer-only, reversible Disable/Enable policy on 2026-07-12 |
| USR-002 | Define customer spend, booking count, and sort semantics | `DEFERRED` | Engineering | USR-001, finance metric contract | Aggregates define statuses, refunds, ties, nulls, and timezone behavior | Deferred on 2026-07-03; feature put on hold |

## M1 - Account state and aggregate APIs

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-101 | Add reversible customer disablement state and migration | `DONE` | Engineering | USR-001 | Customer records can be disabled and enabled with a persisted timestamp while history remains intact | Added `users.disabled_at`, model mapping, and reversible migration on 2026-07-12 |
| USR-102 | Enforce disablement for new customer login | `DONE` | Engineering | USR-101 | Disabled customers receive no OTP and cannot verify an OTP issued before disablement | Customer auth tests passed on 2026-07-12, including disabled issuance and post-issuance disablement cases |
| USR-103 | Build customer-only aggregate query service | `DEFERRED` | Engineering | USR-002 | Queries exclude every staff role and return reconciled booking/net-spend aggregates | Deferred on 2026-07-03; feature put on hold |
| USR-104 | Add authorized customer list and mutation APIs | `DEFERRED` | Engineering | USR-102, USR-103, permission service | Pagination, sorting, filtering, creation, disable, and reactivate are validated and authorized; no edit or delete mutation is exposed | Product scope clarified on 2026-07-12; implementation remains deferred |

## M2 - Users UI and lifecycle actions

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-201 | Build customer KPI cards and table | `DEFERRED` | Engineering | USR-103 | Total customers, bookings, net revenue, and row data use live aggregates | Deferred on 2026-07-03; feature put on hold |
| USR-202 | Add server-driven sorting, filtering, and pagination | `DEFERRED` | Engineering | USR-104 | URL state is stable and large datasets are not loaded into the browser | Deferred on 2026-07-03; feature put on hold |
| USR-203 | Implement customer creation flow | `DEFERRED` | Engineering | USR-104 | Validation safely creates supported individual and company customer accounts; no Edit control is rendered | Product scope clarified on 2026-07-12; implementation remains deferred |
| USR-204 | Implement customer-only disable/enable controls | `DONE` | Engineering | USR-101, USR-102 | Customer rows offer confirmed Disable or Enable with state feedback; non-customer rows offer neither action; server authorization rejects non-customer targets | Implemented on 2026-07-12. Four focused suites passed (23 tests), and Biome passed for all changed implementation/test files |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| USR-301 | Add staff-exclusion and aggregate tests | `DEFERRED` | Engineering | M2 | All staff roles are excluded and sampled totals reconcile | Deferred on 2026-07-03; feature put on hold |
| USR-302 | Add deactivation access-control tests | `DEFERRED` | Engineering | USR-102 | Existing sessions, OTP, dashboard, booking, API, and OAuth paths are denied after deactivation | Deferred on 2026-07-03; feature put on hold |
| USR-303 | Add PII authorization and validation tests | `DEFERRED` | Engineering | USR-104 | Unauthorized reads/mutations and unsafe input fail without PII leakage | Deferred on 2026-07-03; feature put on hold |
| USR-304 | Roll out account-state migration and UI | `DEFERRED` | Engineering / Operations | USR-301 to USR-303 | Migration, smoke tests, monitoring, and rollback evidence are recorded | Deferred on 2026-07-03; feature put on hold |
