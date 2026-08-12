# Project Status

- Last updated: 2026-08-12
- Status: `ACTIVE`
- Release posture: core product workflows are implemented, but repo-wide quality checks are not fully green

## Summary

Milkywayy is an active Next.js application with working customer booking flows, dashboard access, secure completed-property sharing, admin operations, delivery-file workflow, wallet/invoice features, promotions, finance reporting, scheduling calendar workflows, and a completed first-release GPT Actions OAuth integration.

The root `README.md` indexes maintained repository documentation. GitHub Issues
and Project 1 now govern planned work and live workflow status; the former
Notion workspace is retained only as a migration archive.

## Current authorization boundary

- Session cookie helpers are server-only utilities and are not exported as
  remotely callable Server Actions. Verified login/OTP actions and the verified
  booking-handoff route retain the existing cookie and redirect behavior.
- Current staff creation/customer lifecycle, pricing/discount mutation,
  invoice administration, and review/portfolio operations require a
  database-backed `SUPERADMIN` actor at the server operation boundary.
- Customer booking-list reads derive ownership from the current active database
  customer. A caller-provided customer ID cannot broaden the query.
- This compatibility hardening does not implement the deferred Admin/Accounts
  role and permission matrix. Production rollout must replace every old
  application instance and rotate the website session secret so pre-rollout
  sessions are invalidated.

## Implemented product areas

### Public and customer-facing app

- Marketing and landing-page sections exist under `src/components/landing/` and are wired into `src/app/page.js`.
- Customer booking flow exists under `src/app/booking/`, including service selection, property details, scheduling, pricing summary, payment flow, cancellation, and success screens.
- Customer sign-in and session handling exist under `src/app/auth/signin/`, `src/lib/actions/auth.js`, `src/lib/helpers/auth.js`, and `src/lib/contexts/auth.js`.

### Customer dashboard

- Dashboard sections exist for bookings, Properties, invoices, wallet, and external connections under `src/app/dashboard/`.
- Properties retains `/dashboard/files`, delivery-file listing, and dashboard
  deep links while adding stable single/master completed-property links,
  owner-authored listing/contact configuration, FileList-based link creation,
  reference-matched Shared, Master, selection, and listing-form management,
  real Phone/Desktop buyer previews, responsive edge-to-edge public showcases,
  inline media galleries, and a total link-view count without visitor PII.
  Its durable contract is under `docs/customer-property-sharing/`.

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

Most recent repository-wide baseline captured before issue #98 implementation
on 2026-08-12:

- `npm run test:jest:full -- --silent`: `200` test suites passed, `1` was
  skipped, and `13` failed. `1,253` tests passed, `8` were skipped, and `46`
  failed. Do not run this command with privileged or production PostgreSQL
  credentials; legacy integration suites still need migration to the guarded
  disposable-database helper.
- `npm run lint`: `292` errors and `59` warnings across `633` files.
- The issue #98 authorization/UI compatibility gate passed `164` tests across
  `28` focused suites. A production build completed successfully, and the fresh
  build manifest proved that the session helper exposes zero Server Actions
  while all guarded UI actions and admin API routes remain built. The proof is
  reusable through `npm run verify:authorization-boundaries` after a build.
- The production build still skips type validation through the existing Next.js
  configuration and logs the known non-fatal `/admin/promotions` dynamic-render
  warning.

Interpretation:

- The repository is not in a fully green CI-style state.
- The runtime and feature coverage are still substantial, especially around OAuth, GPT APIs, admin flows, and booking/delivery workflows.
- Current quality debt includes repo-wide formatting/import hygiene, booking
  mobile-autoscroll expectations, disposable PostgreSQL suites that require
  explicit test-admin opt-in, and OAuth configuration/token/redirect
  expectation failures.

## Known failing checks

### Failing tests

- Booking mobile-autoscroll expectations do not match current behavior.
- Disposable PostgreSQL suites fail closed when the required test-admin opt-in
  is absent from the ordinary repository-wide command.
- Some legacy PostgreSQL integration suites create/drop databases from `DB_*`
  configuration and must not run with privileged production credentials.
- OAuth environment/configuration, token, and redirect expectations do not match
  the current implementation or test setup.
- Local browser/PDF and disposable PostgreSQL suites fail when their required
  runtime processes are unavailable.

### Lint / formatting backlog

- Biome failures are widespread and mostly span formatting, import ordering, unused imports, and test-file hygiene.
- The lint backlog is broad enough that it should be treated as a dedicated cleanup effort, not incidental drive-by work.

## Documentation status

- `README.md` is the concise index for project, development, status, feature-delivery, agent, and production documentation.
- `docs/PROJECT-OVERVIEW.md` describes the product surfaces, architecture, integrations, domain model, and code map.
- `docs/DEVELOPMENT.md` documents local setup, configuration groups, common commands, and documentation maintenance.
- `docs/gpt-actions-oauth/` remains the detailed durable documentation set for that feature; its `TASKS.md` is a historical first-release ledger.
- `docs/FEATURE-DELIVERY-PLAYBOOK.md` defines the GitHub-first planning and delivery process, while `AGENTS.md` records repo-local agent rules.
- GitHub Issues and Project 1 are authoritative for current scope, tasks, blockers, priority, and status.
- Exact production deployment details remain intentionally local-only in `docs/private/PRODUCTION-DEPLOYMENT.md`.

## Recommended next documentation work

1. Keep `docs/PROJECT-STATUS.md` updated whenever repository health or release posture materially changes.
2. Update the project overview and development guide when architecture, integrations, setup, or commands materially change.
3. Promote accepted implementation knowledge from GitHub Issues into the relevant feature docs in the same pull request as the code.

## Recommended engineering follow-up

1. Fix the currently recorded booking and OAuth test failures and restore a passing Jest baseline.
2. Decide whether to attack the Biome backlog incrementally by area or in one dedicated cleanup branch.
