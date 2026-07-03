# Admin panel UI refresh focused regression plan

- Last updated: 2026-07-03
- Release gate status: `NOT_STARTED`

This is a visual refresh, not a new authorization project. Verification is
limited to preventing the presentation work from breaking current Super Admin
access or operational behavior.

## Automated gates

- Existing Super Admin route and API checks continue to pass for touched surfaces.
- Anonymous access continues to follow the current login behavior.
- Booking detail tests retain workflow, notification, invoice, delivery, revision, upload, publishing, and completion controls.
- Invoice search does not change secure download URLs and filtered totals match visible results.
- Portfolio filtering preserves persisted global ordering.
- Review drag ordering persists within Featured and Standard groups.
- Current Promotions, Calendar, Time Slots, Pricing, Portfolio, and Reviews mutation tests remain green where touched.

## Manual gates

- No current control disappears from a refreshed page.
- Mobile navigation reaches every current destination.
- Horizontally scrolling tables expose every column and action.
- Empty, loading, error, and long-content examples remain usable.
- The owner performs final visual acceptance across the complete admin surface.

## Release blockers

- Loss or breakage of an existing operational control.
- Dashboard or Reports displaying hard-coded prototype values.
- Search, filtering, totals, or ordering producing incorrect persisted results.
- A touched authenticated route becoming accessible without its current Super Admin check.
