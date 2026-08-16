# Project Status

- Last updated: 2026-08-16
- Status: `ACTIVE`
- Release posture: core product workflows are implemented, but repo-wide quality checks are not fully green

## Summary

Milkywayy is an active Next.js application with working customer booking flows, dashboard access, secure completed-property sharing, admin operations, delivery-file workflow, wallet/invoice features, promotions, finance reporting, scheduling calendar workflows, and a completed first-release GPT Actions OAuth integration.

The root `README.md` indexes maintained repository documentation.
`docs/PENDING-TASKS.md` records unfinished work and blockers. GitHub workflow
records and the former Notion workspace are archives only.

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

Most recent repository-wide baseline captured on 2026-08-16:

- `npm run test:jest:full -- --silent`: `215` test suites and `1,323` tests
  passed with no failures or skips. The ordinary baseline excludes suites that
  require explicit PostgreSQL administration or a locally installed Chromium
  binary; those remain available through the dedicated `test:*:postgres`, OAuth
  verification, and `test:invoices:pdf` commands. Do not run PostgreSQL commands
  with privileged or production credentials.
- The separately executed OAuth PostgreSQL protocol fixture passed `7` tests
  after its migration list was brought up to date.
- `npm run lint`: passed on 2026-08-16 across `643` files with no diagnostics.
- The issue #98 authorization/UI compatibility gate passed `186` tests across
  `30` focused suites. A production build completed successfully, and the fresh
  build manifest proved that the session helper exposes zero Server Actions
  while all guarded UI actions and API routes remain built. The proof is
  reusable through `npm run verify:authorization-boundaries` after a build.
- The production build still skips type validation through the existing Next.js
  configuration and logs the known non-fatal `/admin/promotions` dynamic-render
  warning.

Interpretation:

- The repository is not in a fully green CI-style state.
- The runtime and feature coverage are still substantial, especially around OAuth, GPT APIs, admin flows, and booking/delivery workflows.
- Remaining quality limitations are outside the ordinary Jest baseline: guarded
  PostgreSQL suites still require explicit test-admin configuration, the PDF
  smoke test requires local Chromium, and the production build skips type
  validation through existing Next.js configuration.

## Prerequisite-dependent checks

### External test prerequisites

- Booking mobile-autoscroll expectations now match the intentionally retained
  type/size transitions and disabled service/video-format transitions.
- Disposable PostgreSQL suites remain fail-closed unless the required test-admin
  opt-in is supplied to their dedicated commands.
- Some legacy PostgreSQL integration suites create/drop databases from `DB_*`
  configuration and must not run with privileged production credentials.
- The invoice PDF smoke test requires a locally installed Chromium binary and is
  available through `npm run test:invoices:pdf`.

### Lint / formatting status

- The configured Biome check is clean. `adminPrototype.jsx` is intentionally
  excluded because it is a static design reference rather than executable code.

## Documentation status

- `README.md` is the concise index for project, development, status, feature-delivery, agent, and production documentation.
- `docs/PROJECT-OVERVIEW.md` describes the product surfaces, architecture, integrations, domain model, and code map.
- `docs/DEVELOPMENT.md` documents local setup, configuration groups, common commands, and documentation maintenance.
- `docs/gpt-actions-oauth/` remains the detailed durable documentation set for that feature; its `TASKS.md` is a historical first-release ledger.
- `docs/CHANGE-VERIFICATION.md` defines local testing, evidence, review, and safety guidance, while `AGENTS.md` records repository-local agent rules.
- `docs/PENDING-TASKS.md` records unfinished scope and blockers.
- Exact production deployment details remain intentionally local-only in `docs/private/PRODUCTION-DEPLOYMENT.md`.

## Recommended next documentation work

1. Keep `docs/PROJECT-STATUS.md` updated whenever repository health or release posture materially changes.
2. Update the project overview and development guide when architecture, integrations, setup, or commands materially change.
3. Promote accepted implementation knowledge into the relevant feature docs in the same change as the code.

## Recommended engineering follow-up

The unresolved Jest-baseline and Biome-cleanup decisions are tracked only in
`docs/PENDING-TASKS.md`.
