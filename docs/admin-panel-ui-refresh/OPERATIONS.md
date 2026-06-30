# Admin panel UI refresh operations

- Last updated: 2026-06-30

## Rollout strategy

1. Land shared components and tokens without changing routes.
2. Separate the login layout and verify anonymous/authenticated redirects.
3. Migrate the shell and navigation with permission awareness.
4. Migrate pages one at a time: Invoices, Portfolio, Reviews, Bookings, then Dashboard.
5. Enable the Dashboard only after the analytics API reconciliation gate passes.

Each page migration must retain a small rollback boundary. Avoid one commit that
replaces every admin page simultaneously.

## Pre-release checks

- Record the known repository test/lint baseline.
- Run scoped component, route, and domain regression tests for each migrated page.
- Verify desktop, tablet, and mobile layouts with representative empty, loading,
  error, and long-content data.
- Smoke-test booking delivery, invoice download, portfolio ordering/upload, and
  review mutations using non-production fixtures.
- Verify permission-driven navigation for Super Admin, Admin, and Accounts.

## Monitoring

Monitor admin route errors, API failures, client exceptions, failed mutations,
unexpected authorization denials, and support reports of missing controls.
Dashboard query latency is owned with `admin-analytics-finance`.

## Rollback

- Revert an affected page to its prior presentation while retaining compatible
  shared components.
- Roll back the shell independently if navigation or login access is impaired.
- Do not roll back data migrations from other feature folders as part of a UI-only rollback.

Exact live deployment and operator details belong in
`docs/private/PRODUCTION-DEPLOYMENT.md`.
