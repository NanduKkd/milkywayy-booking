# Admin panel UI refresh task tracker

- Last updated: 2026-07-03
- Overall implementation status: `IN_PROGRESS`
- Current milestone: `M2 - Full admin page styling`

This is the authoritative progress tracker. Status values and update rules are
defined in [README.md](./README.md).

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Finalize the UI contract | `DONE` | 3 | 3 | 1 day |
| M1 - Shell, tokens, and shared styling | `DONE` | 3 | 3 | 2-3 days |
| M2 - Full admin page styling | `IN_PROGRESS` | 5 | 11 | 7-10 days |
| M3 - Enhancements and release checks | `NOT_STARTED` | 0 | 5 | 3-5 days |

## M0 - Finalize the UI contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-001 | Approve current page inventory and preservation requirements | `DONE` | Owner / Engineering | None | Every current admin page is in scope and existing behavior takes priority | Approved in the 2026-07-03 planning review; README and ARCHITECTURE list the current route inventory. |
| UI-002 | Approve visual and responsive constraints | `DONE` | Owner / Engineering | UI-001 | Inspirational prototype, dark-only theme, mobile drawer, horizontal tables, and owner visual review are recorded | Accepted as UI-D001, UI-D010, UI-D011, and UI-D016. |
| UI-003 | Review the consolidated delivery contract | `DONE` | Owner | UI-001, UI-002 | Scope, exclusions, enhancements, estimates, and completion definition are accepted | Owner approved the consolidated contract on 2026-07-03. |

## M1 - Shell, tokens, and shared styling

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-101 | Consolidate dark admin tokens and shared primitives | `DONE` | Engineering | UI-003 | Typography, spacing, colors, badges, cards, filters, tables, headers, dialogs, and states are reusable | Added admin-scoped tokens and shared classes in `src/app/globals.css`; created reusable primitives in `src/components/admin/AdminPrimitives.jsx`; adopted the new shell/card foundation in `src/app/admin/layout.js`, `src/components/AdminHeader.js`, `src/components/admin/AdminSidebarNav.js`, and `src/app/admin/page.jsx`; verified with `npx jest src/components/admin/__tests__/AdminPrimitives.test.jsx src/components/admin/__tests__/AdminSidebarNav.test.jsx src/app/admin/__tests__/page.test.jsx --runInBand` and `npx biome check src/app/globals.css src/app/admin/layout.js src/app/admin/page.jsx src/components/AdminHeader.js src/components/admin/AdminSidebarNav.js src/components/admin/AdminPrimitives.jsx src/components/admin/__tests__/AdminPrimitives.test.jsx src/components/ui/badge.js`. |
| UI-102 | Implement grouped desktop navigation and mobile drawer | `DONE` | Engineering | UI-101 | Workspace, Finance, Operations, and Content groups expose every current route; Users is labeled Customers | Grouped the shared route registry in `src/components/admin/adminNavConfig.js`; updated `src/components/admin/AdminSidebarNav.js` to render grouped desktop/mobile navigation with Customers mapped to `/admin/users`; moved mobile navigation into a header-triggered drawer in `src/components/AdminHeader.js` and `src/app/admin/layout.js`; aligned the admin landing route card label in `src/app/admin/page.jsx`; verified with `npx jest src/components/admin/__tests__/AdminSidebarNav.test.jsx src/components/__tests__/AdminHeader.test.jsx src/app/admin/__tests__/page.test.jsx --runInBand` and `npx biome check src/app/admin/layout.js src/app/admin/page.jsx src/components/AdminHeader.js src/components/admin/AdminSidebarNav.js src/components/admin/adminNavConfig.js src/components/admin/__tests__/AdminSidebarNav.test.jsx src/components/__tests__/AdminHeader.test.jsx`. |
| UI-103 | Align header and login styling | `DONE` | Engineering | UI-101 | Current header identity/logout and current login flow use the shared visual language | Updated `src/components/AdminHeader.js` with shared-session identity presentation and refreshed `src/app/admin/login/page.jsx` into the dark admin shell while preserving the existing credential flow; verified with `npx jest src/components/__tests__/AdminHeader.test.jsx src/app/admin/login/__tests__/page.test.jsx --runInBand` and `npx biome check src/components/AdminHeader.js src/components/__tests__/AdminHeader.test.jsx src/app/admin/login/page.jsx src/app/admin/login/__tests__/page.test.jsx`. |

## M2 - Full admin page styling

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-201 | Build the live Dashboard presentation at `/admin` | `DONE` | Engineering | UI-101, Dashboard analytics API | KPI, charts, schedule, recent bookings, drill-downs, loading, and errors use live analytics | Reused the live dashboard analytics surface in `src/app/admin/analytics/FinancialReportsPage.jsx` with a dashboard-only mode, protected `/admin` in `src/app/admin/page.jsx`, and verified with `npx jest src/app/admin/__tests__/page.test.jsx src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx --runInBand` and `npx biome check src/app/admin/page.jsx src/app/admin/__tests__/page.test.jsx src/app/admin/analytics/FinancialReportsPage.jsx src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx`. |
| UI-202 | Refresh Bookings and add status filters | `DONE` | Engineering | UI-101 | All/Completed/Pending/Cancelled filters work and every existing booking workflow control remains available | Rebuilt `src/app/admin/bookings/page.jsx` on the shared admin shell with queue summary cards, live loading/error states, and All/Pending/Completed/Cancelled filters while preserving the current booking details, invoice download, workflow updates, WhatsApp triggers, upload/replacement, publish, delete, and delivery-finish controls; verified with `npx jest src/app/admin/bookings/__tests__/page.test.jsx --runInBand` and `npx biome check src/app/admin/bookings/page.jsx src/app/admin/bookings/__tests__/page.test.jsx`. |
| UI-203 | Refresh Customers | `DONE` | Engineering | UI-101 | `/admin/users` is labeled Customers and current customer operations remain intact | Refreshed the `/admin/users` customer surface in `src/app/admin/users/page.js`, `src/components/UserTable.js`, `src/components/CreateUserForm.js`, `src/app/admin/users/create/page.js`, and `src/app/admin/users/@modal/(.)create/page.js` with the shared dark admin shell while preserving the existing live directory, create-account flow, and pagination behavior; fixed the existing cancel-button submit bug in `src/components/CreateUserForm.js`; verified with `npx jest src/app/admin/users/__tests__/page.test.jsx src/components/__tests__/UserTable.test.jsx --runInBand` and `npx biome check src/app/admin/users/page.js src/components/UserTable.js src/components/CreateUserForm.js src/app/admin/users/create/page.js 'src/app/admin/users/@modal/(.)create/page.js' src/app/admin/users/__tests__/page.test.jsx src/components/__tests__/UserTable.test.jsx`. |
| UI-204 | Refresh Invoices and add search/totals | `DONE` | Engineering | UI-101 | Search covers invoice number, booking reference, and customer; footer totals visible results; downloads work | Rebuilt `src/app/admin/invoices/page.jsx` on the shared admin shell with client-side invoice/customer/booking search, visible summary cards, filtered footer totals, and preserved secure download URLs; added focused coverage in `src/app/admin/invoices/__tests__/page.test.jsx`; verified with `npx jest src/app/admin/invoices/__tests__/page.test.jsx --runInBand` and `npx biome check src/app/admin/invoices/page.jsx src/app/admin/invoices/__tests__/page.test.jsx`. |
| UI-205 | Refresh detailed Reports | `DONE` | Engineering | UI-101, finance reports API | Existing filters, expenses, drill-downs, and exports remain intact at `/admin/analytics` | Refreshed `src/app/admin/analytics/FinancialReportsPage.jsx` and `src/app/admin/analytics/ExpenseTrackerSection.jsx` onto the shared admin shell with consistent headers, cards, empty/error states, table shells, and dialogs while preserving the existing report exports, dashboard drill-downs, and expense CRUD flows; verified with `npx biome check src/app/admin/analytics/FinancialReportsPage.jsx src/app/admin/analytics/ExpenseTrackerSection.jsx` and `npx jest src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx --runInBand`. |
| UI-206 | Refresh Promotions | `NOT_STARTED` | Engineering | UI-101 | Generic, Personal, and Automatic tabs retain all current mutations and customer assignment | Pending |
| UI-207 | Refresh Calendar | `NOT_STARTED` | Engineering | UI-101, current calendar feature | Current calendar, event, block, and booking-preparation behavior remains intact | Pending |
| UI-208 | Refresh Time Slots and Pricing | `NOT_STARTED` | Engineering | UI-101 | Current configuration fields, validation, and save behavior remain intact | Pending |
| UI-209 | Refresh Portfolio and add media filters | `NOT_STARTED` | Engineering | UI-101 | Media-type filters work without breaking CRUD, uploads, visibility, media ordering, or global drag order | Pending |
| UI-210 | Refresh Reviews and add drag ordering | `NOT_STARTED` | Engineering | UI-101 | CRUD, visibility, rating, featured state, and drag ordering within Featured/Standard groups work; no preview column is added | Pending |
| UI-211 | Standardize asynchronous and destructive states | `NOT_STARTED` | Engineering | UI-201 to UI-210 | Touched data surfaces have consistent loading, empty, failure, pending, and confirmation presentation | Pending |

## M3 - Enhancements and release checks

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| UI-301 | Add focused shared-component and navigation tests | `NOT_STARTED` | Engineering | M2 | Grouped navigation, mobile drawer, filters, totals, and shared behaviors have focused coverage | Pending |
| UI-302 | Verify preserved operational workflows | `NOT_STARTED` | Engineering | M2 | Booking, invoice, promotion, calendar, configuration, portfolio, and review smoke checks are recorded | Pending |
| UI-303 | Verify narrow-screen usability | `NOT_STARTED` | Engineering | M2 | Drawer reaches every route and table actions remain reachable by horizontal scrolling | Pending |
| UI-304 | Complete owner visual review | `NOT_STARTED` | Owner | UI-301 to UI-303 | Owner accepts the complete refreshed admin surface | Pending |
| UI-305 | Release the refreshed admin | `NOT_STARTED` | Engineering | UI-304 | One coordinated release is completed and immediate regressions are monitored | Pending |

## Known baseline failures

Recheck these before implementation; they were recorded before this feature and
must not be represented as regressions without confirming the current baseline:

- `src/components/__tests__/DateSlotPicker.test.jsx`: blocked-slot expectation mismatch.
- `src/app/admin/portfolio/__tests__/page.test.jsx`: missing `useRouter` mock.
