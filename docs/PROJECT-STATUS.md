# Project Status

- Last updated: 2026-06-30
- Status: `ACTIVE`
- Release posture: core product workflows are implemented, but repo-wide quality checks are not fully green

## Summary

Milkywayy is an active Next.js application with working customer booking flows, dashboard access, admin operations, delivery-file workflow, wallet/invoice features, and a completed first-release GPT Actions OAuth integration.

The root `README.md` now indexes the maintained project overview, development guide, repository status, feature-delivery workflow, and feature-specific documentation.

## Implemented product areas

### Public and customer-facing app

- Marketing and landing-page sections exist under `src/components/landing/` and are wired into `src/app/page.js`.
- Customer booking flow exists under `src/app/booking/`, including service selection, property details, scheduling, pricing summary, payment flow, cancellation, and success screens.
- Customer sign-in and session handling exist under `src/app/auth/signin/`, `src/lib/actions/auth.js`, `src/lib/helpers/auth.js`, and `src/lib/contexts/auth.js`.

### Customer dashboard

- Dashboard sections exist for bookings, files, invoices, wallet, and external connections under `src/app/dashboard/`.
- Delivery-file listing and dashboard deep-link flow are implemented in `src/app/dashboard/files/` and related delivery services.

### Admin surface

- Admin pages exist for bookings, coupons, discounts, invoices, portfolio, pricing, reviews, time slots, and user management under `src/app/admin/`.
- Admin APIs exist for bookings, uploads, invoices, reviews, timeslots, and portfolio operations under `src/app/api/admin/`.

### Delivery workflow

- Booking delivery workflow, per-file delivery uploads, review allowances, and revision handling are represented in migrations from 2026-06-06 onward and related services/routes.
- PM2 process definitions and the protected auto-complete endpoint show that this flow has been operationalized beyond local-only code.

### OAuth and GPT Actions

- The full GPT Actions OAuth feature has a complete documentation set under `docs/gpt-actions-oauth/`.
- The repo contains OAuth authorize, token, revoke, consent, audit, cleanup, and client provisioning code under `src/app/oauth/`, `src/lib/oauth/`, and related scripts.
- GPT resource API routes exist under `src/app/api/gpt/v1/`.
- The feature docs mark the first OAuth release as complete.

## Data and operations status

- Sequelize migrations exist for core entities such as users, bookings, transactions, wallet transactions, coupons, portfolio/work items, reviews, delivery workflow, OTP controls, and OAuth persistence.
- Repo-managed operational assets exist for PM2 and Nginx-related topology checks, OAuth client provisioning/management, and scheduled workers.
- Exact current production deployment details are intentionally not stored in tracked docs and are maintained only in `docs/private/PRODUCTION-DEPLOYMENT.md`.

## Current repository health

Evidence collected on 2026-06-30:

- `npm test -- --runInBand`: `101` test suites passed and `3` failed. `474` tests passed and `5` failed.
- `npm run lint`: failed with a large pre-existing backlog. Biome reported `202` errors and `72` warnings before hitting its diagnostic limit.

Interpretation:

- The repository is not in a fully green CI-style state.
- The runtime and feature coverage are still substantial, especially around OAuth, GPT APIs, admin flows, and booking/delivery workflows.
- Current quality debt is concentrated in repo-wide formatting/import hygiene plus a small number of behavioral test failures.

## Known failing checks

### Failing tests

- `src/components/__tests__/DateSlotPicker.test.jsx`
  The blocked-slot expectation does not match current component behavior for a morning slot.
- `src/app/admin/portfolio/__tests__/page.test.jsx`
  The test setup does not provide a valid `next/navigation` router shape for `AuthProvider`.
- `src/lib/actions/__tests__/coupons.test.js`
  Coupon expectations do not match current launch-credit behavior and messaging.

### Lint / formatting backlog

- Biome failures are widespread and mostly span formatting, import ordering, unused imports, and test-file hygiene.
- The lint backlog is broad enough that it should be treated as a dedicated cleanup effort, not incidental drive-by work.

## Documentation status

- `README.md` is the concise index for project, development, status, feature-delivery, agent, and production documentation.
- `docs/PROJECT-OVERVIEW.md` describes the product surfaces, architecture, integrations, domain model, and code map.
- `docs/DEVELOPMENT.md` documents local setup, configuration groups, common commands, and documentation maintenance.
- `docs/gpt-actions-oauth/` remains the detailed and authoritative documentation set for that feature.
- `docs/FEATURE-DELIVERY-PLAYBOOK.md` defines the standard feature planning and tracking process, while `AGENTS.md` records repo-local agent rules.
- Exact production deployment details remain intentionally local-only in `docs/private/PRODUCTION-DEPLOYMENT.md`.

## Recommended next documentation work

1. Keep `docs/PROJECT-STATUS.md` updated whenever repository health or release posture materially changes.
2. Update the project overview and development guide when architecture, integrations, setup, or commands materially change.
3. Create feature folders for upcoming multi-file initiatives using the feature delivery playbook.

## Recommended engineering follow-up

1. Fix the three failing test areas and restore a passing Jest baseline.
2. Decide whether to attack the Biome backlog incrementally by area or in one dedicated cleanup branch.
