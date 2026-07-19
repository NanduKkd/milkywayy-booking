# Admin scheduling calendar delivery plan

- Last updated: 2026-07-03
- Planning status at GitHub migration: `IN_PROGRESS`
- Implementation status at GitHub migration: `IN_PROGRESS`
- Current rollout issue: [#12](https://github.com/NanduKkd/milkywayy-booking/issues/12)
- Target: provide one booking-centric admin calendar backed by the existing availability rules.

## Purpose

Add the target Calendar experience for viewing bookings, blocking availability,
creating non-blocking calendar events, and preparing customer bookings without
creating a second scheduling, registration, pricing, or checkout authority.

## Document index

- [TASKS.md](./TASKS.md): historical delivery ledger retained for migration evidence.
- [ARCHITECTURE.md](./ARCHITECTURE.md): event, booking, and availability flows.
- [DECISIONS.md](./DECISIONS.md): scheduling precedence and manual-entry decisions.
- [OPERATIONS.md](./OPERATIONS.md): migration, rollout, and recovery.
- [ROLLOUT-VERIFICATION.md](./ROLLOUT-VERIFICATION.md): tracked automated rollout evidence and the handoff to private deployment notes.
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
- Full-day and exact time-range blocking in 30-minute increments, integrated
  with Time Slots availability.
- Non-blocking calendar events with a title, optional description, date, and
  full-day or 30-minute-aligned start/end selection.
- Multi-property admin booking preparation for existing and new customers.
- Secure customer handoff through editable prefilled registration/property
  details, phone OTP verification when registration is required, and the normal
  promotion-aware payment flow.
- Four-hour pending availability holds with copyable, regeneratable payment links.
- Optional customer-state-specific WhatsApp handoff notifications, defaulting off.
- Server-side conflict validation without an admin availability or price override.
- Shared Dubai-business-time date interpretation.

## Explicit non-goals

- Redesigning the Time Slots page.
- Replacing property/service weight configuration.
- Making informational events affect customer availability; only blocks do so.
- Recurring calendar events in the first release.

## Dependencies

- Existing Time Slots configuration and date override API.
- Existing booking creation, pricing, payment, invoice, and workflow services.
- Existing customer registration, OTP, promotion, checkout, payment, invoice,
  dashboard, and WhatsApp notification services.
- Calendar access remains Super Admin-only while `admin-access-control` is deferred.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Scheduling contract | 1-2 engineering days |
| M1 - Shared calendar data and persistence | 3-4 engineering days |
| M2 - Calendar UI and manual-entry flows | 5-7 engineering days |
| M3 - Concurrency, security, and rollout verification | 3-4 engineering days |

## Completion definition

- Calendar, customer availability, and Time Slots produce consistent answers.
- Events, blocks, and admin booking preparation are clearly distinguished.
- Existing bookings cannot be silently invalidated by new blocks or events.
- Concurrent changes are revalidated server-side before persistence.
- Calendar events never affect customer availability.
- New and existing customers enter the correct editable handoff path and finish
  through the existing promotion-aware payment flow.
