# Admin panel UI refresh delivery plan

- Last updated: 2026-07-12
- Planning status at GitHub migration: `DONE`
- Implementation status at GitHub migration: `IN_PROGRESS`
- Current acceptance/release issue: [#14](https://github.com/NanduKkd/milkywayy-booking/issues/14)
- Target: make the complete current Super Admin interface visually consistent with the approved prototype direction while preserving working behavior.

## Purpose

Refresh the styling of every current admin page with one dark visual system. The
prototype is inspiration rather than a pixel specification. Existing routes,
data, forms, and operational workflows remain authoritative.

## Document index

- [TASKS.md](./TASKS.md): historical delivery ledger retained for migration evidence.
- [ARCHITECTURE.md](./ARCHITECTURE.md): UI boundaries, routing, and shared components.
- [DECISIONS.md](./DECISIONS.md): accepted visual and compatibility decisions.
- [OPERATIONS.md](./OPERATIONS.md): release and rollback notes.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): focused regression gates.

## Status model

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | Work cannot proceed without a recorded decision or dependency. |
| `IN_REVIEW` | Work is complete and awaiting verification. |
| `DONE` | Acceptance criteria are satisfied and evidence is recorded. |
| `DEFERRED` | Explicitly removed from this release. |

## Release scope

- Apply the grouped dark admin shell to all current authenticated routes:
  - Workspace: Dashboard, Bookings, Calendar, and Customers.
  - Finance: Invoices and Reports.
  - Operations: Promotions, Time Slots, and Pricing.
  - Content: Portfolio and Reviews.
- Keep `/admin` as the live analytics Dashboard and `/admin/analytics` as the detailed Reports page.
- Label the existing `/admin/users` destination as **Customers**; the route does not change.
- Keep Generic Codes, Personal Auto-Apply, and Automatic Discounts as tabs inside the existing Promotions page. Legacy Discounts and Coupons routes continue to redirect there.
- Style the current login page in the same visual language without restructuring its authentication flow.
- Add Bookings status filters, Invoice search with filtered totals, and Portfolio media-type filters.
- Preserve Portfolio drag ordering and add drag ordering for Reviews. Featured reviews remain ordered ahead of standard reviews, with drag ordering within each group.
- Use a mobile navigation drawer. Wide data tables remain tables and scroll horizontally on narrow screens.
- Preserve all existing forms, mutations, downloads, uploads, workflow controls, analytics, calendar behavior, configuration editing, and visibility controls, except that Pricing now intentionally exposes only price fields in the approved prototype matrix. Its save still submits the complete configuration so hidden slot and evening-rule metadata is preserved.
- Match the `adminPrototype.jsx` Pricing Configuration layout: one header save action, property-type tabs, and one horizontally scrollable price matrix backed by live configuration data.

## Explicit non-goals

- Adding Admin, Accounts, Settings, or configurable permissions; this release supports the current Super Admin surface only.
- A light or system theme.
- Pixel-perfect reproduction of `adminPrototype.jsx` across the full admin. The Pricing Configuration page is the explicit exception and follows its prototype layout while adapting the columns to the live data shape.
- Adding unsupported prototype actions such as **New Booking**.
- Adding a review-text preview column.
- Replacing mobile tables with purpose-built record cards.
- Formal WCAG certification, exhaustive browser certification, or automated visual approval.
- Rewriting working domain services or copying prototype sample data into runtime code.

## Dependencies

- `admin-analytics-finance` supplies live Dashboard and Reports data.
- `admin-scheduling-calendar` supplies the current Calendar behavior.
- `promotions-management` supplies the consolidated Promotions page.

The deferred `admin-access-control` feature is not a dependency for this release.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Finalize the UI contract | 1 engineering day |
| M1 - Shell, tokens, and shared styling | 2-3 engineering days |
| M2 - Full admin page styling | 7-10 engineering days |
| M3 - Search, filters, ordering, and release checks | 3-5 engineering days |

The work ships as one release, although implementation may use page-scoped
commits to keep review and debugging manageable.

## Completion definition

- Every current admin page uses the same dark shell and shared visual language.
- `/admin` renders live Dashboard analytics; `/admin/analytics` remains Reports.
- Requested search, filter, and ordering controls operate on live data.
- Existing operational actions remain available and pass focused regression tests.
- Mobile navigation uses a drawer and wide tables can be deliberately scrolled.
- No unsupported prototype control or hard-coded prototype business data is introduced.
- The owner completes final visual acceptance before release.
