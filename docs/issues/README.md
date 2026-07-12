# Issue register

- Last updated: 2026-07-12
- Purpose: authoritative status index for issues discovered during manual audits

## Status model

Issue status uses the project delivery values:

- `NOT_STARTED`: confirmed and awaiting implementation.
- `IN_PROGRESS`: implementation is active and has an owner.
- `BLOCKED`: progress requires a documented dependency or decision.
- `IN_REVIEW`: implementation is awaiting verification.
- `DONE`: the expected behavior is implemented and resolution evidence is recorded.
- `DEFERRED`: explicitly removed from the current release.

Every issue file must state its status, implementation owner, and whether project-owner intervention is required. Update this register and the issue file in the same change. An issue may be marked `DONE` only when its resolution evidence is recorded in the issue file.

## Current issues

| Issue | Severity | Status | Owner | Project-owner intervention |
|---|---|---|---|---|
| [Portfolio load failure is presented as an empty library](./portfolio-load-failure-misleading-empty-state.md) | High | `NOT_STARTED` | Engineering | No |
| [Promotions catalog fails to load](./promotions-catalog-fails-to-load.md) | High | `DONE` | Engineering | No |
| [Expense Tracker fails to load on Reports](./reports-expense-tracker-validation-error.md) | High | `NOT_STARTED` | Engineering | No |
| [Report month input does not update the displayed reports](./reports-month-filter-does-not-apply.md) | High | `DONE` | Engineering | No |
| [Review load failure is presented as an empty testimonial set](./reviews-load-failure-misleading-empty-state.md) | High | `DONE` | Engineering | No |
| [Scheduling calendar overflows horizontally on desktop](./scheduling-calendar-desktop-horizontal-overflow.md) | Medium | `NOT_STARTED` | Engineering | No |
| [Time-slots dialog offers “Unblock Day” for an unblocked date](./timeslots-unblock-day-shown-without-blocks.md) | Low | `NOT_STARTED` | Engineering | No |
| [User row actions do not provide account lifecycle controls](./users-row-actions-no-response.md) | Medium | `DONE` | Engineering | No — product decision recorded 2026-07-12 |
| [Pagination controls remain enabled on a single-page directory](./users-single-page-pagination-enabled.md) | Low | `DONE` | Engineering | No |
