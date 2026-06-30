# Admin panel UI refresh security test plan

- Last updated: 2026-06-30
- Release gate status: `NOT_STARTED`

## Automated gates

- Anonymous access to authenticated admin pages redirects safely to login.
- Login never renders authenticated navigation, staff identity, or logout actions.
- Customer sessions cannot render or directly access admin pages.
- Navigation visibility matches permission snapshots for Admin and Accounts.
- Direct API/action tests prove that hidden navigation is not the authorization boundary.
- Booking detail tests preserve invoice, workflow, notification, delivery,
  revision, upload, replacement, publishing, and completion controls.
- User-provided property, customer, review, and portfolio text is escaped safely.
- Invoice search parameters are validated and cannot broaden authorization.

## Manual gates

- Keyboard-only navigation reaches every visible route and action with visible focus.
- Screen-reader names distinguish icon-only edit, delete, download, visibility,
  feature, close, and navigation controls.
- Mobile navigation can be opened, closed, and dismissed without trapping focus.
- Forbidden and expired-session states reveal no sensitive page content before redirect.
- Destructive actions require clear confirmation and show the affected record.

## Release blockers

- Any loss of an existing booking delivery control.
- Authenticated shell content visible on login or before authorization resolves.
- A page/API accessible without its required server permission.
- Sensitive content rendered through unsafe HTML.
- Unrecorded regression against a previously working operational smoke test.
