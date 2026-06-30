# Admin panel UI refresh delivery plan

- Last updated: 2026-06-30
- Planning status: `IN_PROGRESS`
- Implementation status: `NOT_STARTED`
- Target: replace the current admin presentation with the approved prototype visual language without removing working operational behavior.

## Purpose

Deliver the new admin shell and page designs for Dashboard, Bookings, Invoices,
Portfolio, Reviews, and Login. The prototype is a visual specification; existing
production workflows remain authoritative.

## Document index

- [TASKS.md](./TASKS.md): authoritative implementation tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): UI boundaries, routing, and shared components.
- [DECISIONS.md](./DECISIONS.md): accepted visual and compatibility decisions.
- [OPERATIONS.md](./OPERATIONS.md): rollout and rollback plan.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): authentication and regression gates.

## Status model

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | Work cannot proceed without a recorded decision or dependency. |
| `IN_REVIEW` | Implementation is complete and awaiting verification. |
| `DONE` | Acceptance criteria are satisfied and evidence is recorded. |
| `DEFERRED` | Explicitly removed from this release. |

## Initial scope

- New grouped admin sidebar, breadcrumb header, administrator identity, responsive navigation, and consistent dark visual system.
- Dedicated unauthenticated login layout matching the new design.
- New Dashboard presentation wired to analytics supplied by `admin-analytics-finance`.
- New Bookings list, filters, and detail presentation while preserving all current delivery workflows.
- Invoice search and filtered-total footer while preserving real invoice downloads.
- Portfolio media filters and target styling while preserving upload, CRUD, ordering, and visibility behavior.
- Review preview column and target styling while preserving CRUD, featured, ordering, rating, and visibility behavior.
- Accessible responsive tables, dialogs, loading states, empty states, and error states.

## Explicit non-goals

- Redesigning Time Slots or Pricing in this release.
- Reimplementing analytics calculations in UI components.
- Replacing existing booking workflow, upload, invoice, portfolio, or review services.
- Copying hard-coded prototype data into production code.

## Dependencies

- `admin-analytics-finance` for Dashboard data contracts.
- `admin-access-control` for permission-aware navigation and administrator identity.
- `admin-scheduling-calendar` for the Calendar navigation destination.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Scope and design contract | 1-2 engineering days |
| M1 - Shell and shared UI foundation | 2-3 engineering days |
| M2 - Page migrations | 5-7 engineering days |
| M3 - Responsive, accessibility, and regression verification | 2-3 engineering days |

## Completion definition

- Every in-scope page matches the approved visual direction at desktop and mobile breakpoints.
- Existing operational actions remain available and pass scoped regression tests.
- Login is not rendered inside the authenticated admin shell.
- Permission-aware navigation does not expose inaccessible sections.
- No hard-coded prototype business data remains in runtime components.
