# Admin customer management delivery plan

- Last updated: 2026-07-03
- Planning status: `DEFERRED`
- Implementation status: `DEFERRED`
- Target: deferred for a later release; the Users page remains intended to become a customer-only operational view with aggregates, sorting, editing, and safe deactivation when work resumes.

## Purpose

Separate customer management from staff administration. Staff accounts are
managed only in Settings; Users lists only `CUSTOMER` accounts and their booking
and net-spend summaries.

## Current status

This feature is on hold and has been deferred to a later release.
No implementation work should start against this folder until the feature is
reactivated and the task tracker is updated.

## Document index

- [TASKS.md](./TASKS.md): authoritative tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): customer query, aggregate, and deactivation flows.
- [DECISIONS.md](./DECISIONS.md): staff separation and deletion policy.
- [OPERATIONS.md](./OPERATIONS.md): migration and rollout plan.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): PII and authorization gates.

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

- Customer-only list and summary KPIs.
- Server-side pagination, sorting, and filtering by customer name, booking count, and net spend.
- Customer create and edit flows.
- Safe customer deactivation/reactivation instead of hard deletion.
- Deactivated-account enforcement across authentication, booking, dashboard, API, and OAuth access.
- Staff removal from Users and management through `admin-access-control` Settings.

## Explicit non-goals

- Hard deletion of customers or their financial/booking history.
- Staff invitations or staff permission editing; those belong to Settings.
- Customer segmentation, marketing automation, or bulk messaging.

## Dependencies

- `admin-access-control` for staff management and customer-management permissions.
- Existing customer authentication, booking, transaction, wallet, and OAuth services.
- `admin-analytics-finance` revenue definition for net customer spend.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Customer-management contract | 1-2 engineering days |
| M1 - Account state and aggregate APIs | 3-4 engineering days |
| M2 - Users UI and lifecycle actions | 3-5 engineering days |
| M3 - Security and rollout verification | 2-3 engineering days |

## Completion definition

- No staff account appears in Users queries, counts, exports, or search results.
- Booking and net-spend totals reconcile to source records.
- Deactivation blocks new and existing access without deleting history.
- Reactivation is authorized and auditable.
- Pagination and sorting remain server-side and stable at production data volume.
