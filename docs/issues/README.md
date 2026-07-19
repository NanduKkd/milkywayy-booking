# Issue register

- Last updated: 2026-07-12
- Purpose: historical status index for issues discovered during manual audits

> GitHub Issues and Project 1 are authoritative for current issues and workflow status. This file is retained as an audit snapshot.

## Status model

Issue status uses the project delivery values:

- `NOT_STARTED`: confirmed and awaiting implementation.
- `IN_PROGRESS`: implementation is active and has an owner.
- `BLOCKED`: progress requires a documented dependency or decision.
- `IN_REVIEW`: implementation is awaiting verification.
- `DONE`: the expected behavior is implemented and resolution evidence is recorded.
- `DEFERRED`: explicitly removed from the current release.

The rows below preserve their migration-time resolution evidence. Create and
maintain all new defects in GitHub Issues rather than extending this register.

## Current issues

| Issue | Severity | Status | Owner | Project-owner intervention |
|---|---|---|---|---|
| [Portfolio load failure is presented as an empty library](./portfolio-load-failure-misleading-empty-state.md) | High | `DONE` | Engineering | No |
| [Promotions catalog fails to load](./promotions-catalog-fails-to-load.md) | High | `DONE` | Engineering | No |
| [Expense Tracker fails to load on Reports](./reports-expense-tracker-validation-error.md) | High | `DONE` | Engineering | No |
| [Report month input does not update the displayed reports](./reports-month-filter-does-not-apply.md) | High | `DONE` | Engineering | No |
| [Review load failure is presented as an empty testimonial set](./reviews-load-failure-misleading-empty-state.md) | High | `DONE` | Engineering | No |
| [Scheduling calendar overflows horizontally on desktop](./scheduling-calendar-desktop-horizontal-overflow.md) | Medium | `DONE` | Engineering | No |
| [Time-slots dialog offers “Unblock Day” for an unblocked date](./timeslots-unblock-day-shown-without-blocks.md) | Low | `DONE` | Engineering | No |
| [User row actions do not provide account lifecycle controls](./users-row-actions-no-response.md) | Medium | `DONE` | Engineering | No — product decision recorded 2026-07-12 |
| [Pagination controls remain enabled on a single-page directory](./users-single-page-pagination-enabled.md) | Low | `DONE` | Engineering | No |
