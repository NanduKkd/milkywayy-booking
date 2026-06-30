# Admin panel UI refresh task tracker

- Last updated: 2026-06-30
- Overall implementation status: `NOT_STARTED`
- Current milestone: `M0 - Scope and design contract`

This is the authoritative progress tracker. Status values and update rules are
defined in [README.md](./README.md).

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Scope and design contract | `IN_PROGRESS` | 0 | 2 | 1-2 days |
| M1 - Shell and shared UI foundation | `NOT_STARTED` | 0 | 4 | 2-3 days |
| M2 - Page migrations | `NOT_STARTED` | 0 | 6 | 5-7 days |
| M3 - Verification and rollout | `NOT_STARTED` | 0 | 4 | 2-3 days |

## M0 - Scope and design contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-001 | Approve page inventory and preservation requirements | `IN_REVIEW` | Product / Engineering | None | In-scope pages and preserved behavior are accepted | Pending |
| UI-002 | Define responsive and accessibility acceptance matrix | `NOT_STARTED` | Engineering | UI-001 | Desktop, tablet, mobile, keyboard, focus, and screen-reader checks are listed | Pending |

## M1 - Shell and shared UI foundation

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-101 | Implement admin design tokens and shared primitives | `NOT_STARTED` | Engineering | UI-002 | Typography, spacing, colors, status badges, cards, tables, headers, and dialogs are reusable | Pending |
| UI-102 | Replace admin shell and grouped navigation | `NOT_STARTED` | Engineering | UI-101, RBAC permission contract | Navigation is responsive, permission-aware, route-based, and keyboard accessible | Pending |
| UI-103 | Implement breadcrumb and administrator identity header | `NOT_STARTED` | Engineering | UI-102 | Header derives section, page, user name, initials, and role from live state | Pending |
| UI-104 | Separate and redesign the login layout | `NOT_STARTED` | Engineering | UI-101 | Anonymous users see no authenticated navigation; existing login/session behavior remains intact | Pending |

## M2 - Page migrations

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-201 | Build Dashboard presentation | `NOT_STARTED` | Engineering | UI-101, finance dashboard API | KPI, charts, schedule, recent bookings, quick links, loading, and error states use live data | Pending |
| UI-202 | Restyle Bookings and preserve workflow tools | `NOT_STARTED` | Engineering | UI-101 | Filters and target detail layout coexist with workflow updates, notifications, invoices, uploads, versions, revisions, publishing, and completion | Pending |
| UI-203 | Add invoice search and filtered totals | `NOT_STARTED` | Engineering | UI-101 | Search covers invoice number, booking reference, and customer; footer totals current results; downloads work | Pending |
| UI-204 | Restyle Portfolio and add media filters | `NOT_STARTED` | Engineering | UI-101 | Filtering does not break create/edit/upload/reorder/visibility/delete behavior | Pending |
| UI-205 | Restyle Reviews and add quote preview | `NOT_STARTED` | Engineering | UI-101 | Preview, CRUD, feature, visibility, rating, and ordering remain correct | Pending |
| UI-206 | Add shared loading, empty, error, and confirmation states | `NOT_STARTED` | Engineering | UI-201 to UI-205 | Every in-scope data surface handles pending, empty, failed, and destructive states consistently | Pending |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-301 | Add component and navigation regression tests | `NOT_STARTED` | Engineering | M2 | In-scope components and routes have automated behavioral coverage | Pending |
| UI-302 | Run responsive and accessibility verification | `NOT_STARTED` | Engineering | UI-301 | Acceptance matrix is complete with no release-blocking issues | Pending |
| UI-303 | Verify preserved operational workflows manually | `NOT_STARTED` | Engineering / Operations | UI-301 | Booking delivery, invoice, portfolio, and review smoke tests are recorded | Pending |
| UI-304 | Roll out and monitor the refreshed surface | `NOT_STARTED` | Engineering / Operations | UI-302, UI-303 | Rollout and rollback evidence is recorded without exposing live deployment details | Pending |

## Known baseline failures

The following failures predate this feature and must not be represented as
regressions introduced by it:

- `src/components/__tests__/DateSlotPicker.test.jsx`: blocked-slot expectation mismatch.
- `src/app/admin/portfolio/__tests__/page.test.jsx`: missing `useRouter` mock.
- `src/lib/actions/__tests__/coupons.test.js`: launch-credit behavior/message expectations are stale.
