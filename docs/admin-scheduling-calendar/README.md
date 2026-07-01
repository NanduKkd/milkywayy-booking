# Admin scheduling calendar delivery plan

- Last updated: 2026-07-02
- Planning status: `IN_PROGRESS`
- Implementation status: `IN_PROGRESS`
- Target: provide one booking-centric admin calendar backed by the existing availability rules.

## Purpose

Add the target Calendar experience for viewing bookings, blocking availability,
creating calendar-only events, and creating full admin bookings without creating
a second scheduling authority.

## Document index

- [TASKS.md](./TASKS.md): authoritative tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): event, booking, and availability flows.
- [DECISIONS.md](./DECISIONS.md): scheduling precedence and manual-entry decisions.
- [OPERATIONS.md](./OPERATIONS.md): migration, rollout, and recovery.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): authorization and concurrency gates.

## Status model

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | Work cannot proceed without a recorded dependency or decision. |
| `IN_REVIEW` | Work awaits verification. |
| `DONE` | Acceptance criteria and evidence are complete. |
| `DEFERRED` | Removed from this release. |

## Initial scope

- Monthly calendar showing bookings and calendar-only events with status markers.
- Selected-day schedule and upcoming-shoot table.
- Full-day and period blocking through the existing Time Slots date overrides.
- Manual entry chooser supporting calendar-only events and complete admin-created bookings.
- Capacity-aware calendar-only events that can optionally reserve customer availability.
- Server-side conflict validation and explicit override handling for administrators.
- Shared Dubai-business-time date interpretation.

## Explicit non-goals

- Redesigning the Time Slots page.
- Replacing property/service weight configuration.
- Turning notes that do not reserve capacity into customer bookings.
- Recurring calendar events in the first release.

## Dependencies

- Existing Time Slots configuration and date override API.
- Existing booking creation, pricing, payment, invoice, and workflow services.
- `admin-access-control` for calendar view, block, event-create, and booking-create permissions.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Scheduling contract | 1-2 engineering days |
| M1 - Shared calendar data and persistence | 3-4 engineering days |
| M2 - Calendar UI and manual-entry flows | 5-7 engineering days |
| M3 - Concurrency, security, and rollout verification | 3-4 engineering days |

## Completion definition

- Calendar, customer availability, and Time Slots produce consistent answers.
- Both manual entry modes work and are clearly distinguished.
- Existing bookings cannot be silently invalidated by new blocks or events.
- Concurrent changes are revalidated server-side before persistence.
- Calendar-only events reserve capacity only when explicitly configured to do so.
