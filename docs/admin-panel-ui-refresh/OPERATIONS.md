# Admin panel UI refresh operations

- Last updated: 2026-07-03

## Release strategy

The refreshed admin ships as one coordinated release. Implementation may still
use page-scoped commits so regressions are easier to identify, but no mixed old
and new admin presentation is an intended production state.

## Pre-release checks

- Record the repository test/lint baseline before implementation.
- Run focused tests for every touched admin page and shared component.
- Smoke-test booking workflows, invoice downloads, promotion mutations, calendar actions, Time Slot and Pricing saves, Portfolio operations, and Review operations.
- Verify Dashboard and Reports use live analytics and retain drill-down/export behavior.
- Verify Portfolio filters do not alter global drag order.
- Verify Review drag ordering persists within Featured and Standard groups.
- Verify mobile navigation opens as a drawer and each wide table can be scrolled to its actions.
- Hand the complete refreshed surface to the owner for final visual acceptance.

## Monitoring and recovery

After release, monitor admin route errors, failed data loads, failed mutations,
and reports of missing controls. If a release-blocking regression appears, revert
the UI-refresh release while preserving unrelated data migrations and feature
work.

Exact live deployment and operator details belong in
`docs/private/PRODUCTION-DEPLOYMENT.md`.
