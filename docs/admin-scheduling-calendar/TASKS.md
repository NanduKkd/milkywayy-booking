# Admin scheduling calendar task tracker

- Last updated: 2026-06-30
- Overall implementation status: `NOT_STARTED`
- Current milestone: `M0 - Scheduling contract`

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Scheduling contract | `IN_PROGRESS` | 0 | 2 | 1-2 days |
| M1 - Data and shared availability | `NOT_STARTED` | 0 | 4 | 3-4 days |
| M2 - Calendar and entry flows | `NOT_STARTED` | 0 | 5 | 5-7 days |
| M3 - Verification and rollout | `NOT_STARTED` | 0 | 4 | 3-4 days |

## M0 - Scheduling contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CAL-001 | Approve availability precedence and capacity semantics | `IN_REVIEW` | Product / Engineering | None | Working days, blocks, events, bookings, capacity, and overrides have one documented order | Pending |
| CAL-002 | Approve manual event and full-booking field contracts | `IN_REVIEW` | Product / Engineering | CAL-001 | Required fields and side effects for both creation modes are explicit | Pending |

## M1 - Data and shared availability

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CAL-101 | Add calendar-only event persistence and migration | `NOT_STARTED` | Engineering | CAL-002 | Events store schedule, label/details, capacity behavior, creator, status, and audit timestamps | Pending |
| CAL-102 | Build unified calendar query service | `NOT_STARTED` | Engineering | CAL-101 | One bounded query returns bookings, events, and effective blocks for a date range | Pending |
| CAL-103 | Extract shared availability evaluation | `NOT_STARTED` | Engineering | CAL-001 | Customer booking and admin calendar use the same precedence and capacity calculations | Pending |
| CAL-104 | Add transactional conflict revalidation | `NOT_STARTED` | Engineering | CAL-103 | Conflicting concurrent creates/blocks fail safely with actionable responses | Pending |

## M2 - Calendar and entry flows

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CAL-201 | Build month calendar, legend, navigation, and selected-day panel | `NOT_STARTED` | Engineering | CAL-102 | Live bookings, events, and blocks render with accessible status distinctions | Pending |
| CAL-202 | Build upcoming schedule table and date navigation | `NOT_STARTED` | Engineering | CAL-102 | Filtering and row navigation remain bounded to the selected range | Pending |
| CAL-203 | Integrate full-day and period blocking | `NOT_STARTED` | Engineering | CAL-103, permission service | Blocks reuse existing overrides and warn when bookings/events already exist | Pending |
| CAL-204 | Implement calendar-only event CRUD | `NOT_STARTED` | Engineering | CAL-101, CAL-104 | Authorized admins can create, edit, cancel, and restore capacity correctly | Pending |
| CAL-205 | Implement full admin-booking creation | `NOT_STARTED` | Engineering | CAL-104, existing booking services | Admin-created bookings use the normal pricing/workflow model with explicit payment state and no forced Stripe checkout | Pending |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CAL-301 | Add availability and precedence tests | `NOT_STARTED` | Engineering | M2 | Working-day, block, capacity, event, booking, override, and timezone cases pass | Pending |
| CAL-302 | Add concurrency and authorization tests | `NOT_STARTED` | Engineering | CAL-301 | Double-booking and unauthorized mutation cases fail safely | Pending |
| CAL-303 | Run booking and Time Slots regression suite | `NOT_STARTED` | Engineering | CAL-301 | Existing scheduling behavior has no undocumented regression | Pending |
| CAL-304 | Roll out schema and Calendar UI | `NOT_STARTED` | Engineering / Operations | CAL-302, CAL-303 | Migration, smoke-test, monitoring, and rollback evidence is recorded | Pending |
