# Issue 26 visual QA

- Captured: 2026-07-20
- Viewports: 1440 × 1000 desktop and 390 × 844 narrow
- Data safety: screenshots are limited to aggregate, calendar-grid, and navigation surfaces. No customer names, contact values, credentials, private URLs, or production identifiers are included.

## Sanitized screenshots

### Dashboard desktop

![Dense dashboard desktop](./dashboard-desktop.jpg)

### Calendar desktop

![Compact calendar desktop](./calendar-desktop.jpg)

### Calendar narrow

![Compact calendar narrow](./calendar-narrow.jpg)

### Mobile navigation

![Compact mobile navigation](./mobile-navigation.jpg)

## Route-by-route checks

Every current authenticated route was loaded against the local implementation at both viewports. Desktop checks verified the 208-pixel sidebar, 52-pixel header, expected primary heading, and absence of document-level horizontal overflow. Narrow checks verified the desktop sidebar is hidden, the mobile menu is present, the expected primary heading renders, and wide content stays inside intentional local scrollers.

| Surface | Route | Desktop | Narrow |
|---|---|---|---|
| Dashboard | `/admin` | Pass | Pass |
| Bookings | `/admin/bookings` | Pass | Pass |
| Calendar | `/admin/scheduling-calendar` | Pass | Pass |
| Customers | `/admin/users` | Pass | Pass |
| Invoices | `/admin/invoices` | Pass | Pass |
| Reports | `/admin/analytics` | Pass | Pass |
| Promotions | `/admin/promotions` | Pass | Pass |
| Time Slots | `/admin/timeslots` | Pass | Pass after containing the service-weight matrix in its local scroller |
| Pricing | `/admin/prices` | Pass | Pass |
| Portfolio | `/admin/portfolio` | Pass | Pass |
| Reviews | `/admin/reviews` | Pass | Pass |

## Behavior-sensitive visual checks

- Calendar month cells remain fixed height and show at most two short status markers plus `+N` overflow.
- Calendar selected-day hierarchy presents bookings and events before availability controls.
- Calendar and Time Slots expose named-slot blocking without exact-time or dedicated full-day creation controls.
- The mobile drawer exposes every current navigation group and route.
- Wide tables and configuration matrices scroll inside their panels without widening the document.
