# Development Guide

- Last updated: 2026-07-01

## Prerequisites

- Node.js with npm. The repository uses `package-lock.json`; prefer npm so the
  installed dependency graph matches the lockfile.
- PostgreSQL for application data and database-backed integration tests.
- Credentials for Stripe, AWS, or Twilio only when developing the corresponding
  integration.

The repository does not currently declare a specific Node.js version. Use a
version supported by the installed Next.js release and verify it with
`npm run build`.

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create an ignored `.env` file and configure a PostgreSQL database:

   ```dotenv
   DB_HOST=
   DB_PORT=
   DB_NAME=
   DB_USER=
   DB_PASSWORD=
   ```

   Environment files are ignored by Git. Do not commit real credentials or
   copy production values into documentation.

3. Create the database named by `DB_NAME`, then run its migrations:

   ```bash
   npx sequelize-cli db:migrate
   ```

   Sequelize CLI paths are configured in [`.sequelizerc`](../.sequelizerc).
   Test configuration uses a database named `${DB_NAME}_test`; create it when
   running database-backed integration tests.

4. Start the development server:

   ```bash
   npm run dev
   ```

   The default development URL is `http://localhost:3000`.

Non-production customer OTP login can generate a debug OTP without Twilio
credentials. Payment checkout, webhooks, remote storage, and outbound
notifications still require their corresponding integration configuration.

## Environment configuration

Only variable names and responsibilities belong in tracked documentation. Keep
values in ignored environment files and use the private production runbook for
live configuration.

### Database and session

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL
  connection used by the application, migrations, and database-backed tests.
- `JWT_SECRET`: signs the session cookie. Development and test have explicit
  non-production fallbacks; production requires a secret of at least 32
  characters.
- `NEXT_PUBLIC_BASE_URL`: public application origin used when constructing
  redirects and application links.
- `PROPERTY_SHARE_RECEIPT_SECRET`: signs PII-free public property access
  receipts. Production requires at least 32 characters; development/test use a
  non-production fallback.

### Payments

- `STRIPE_SECRET_KEY`: server-side Stripe API access.
- `STRIPE_WEBHOOK_SECRET`: verifies Stripe webhook signatures.

### File storage and delivery

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
  `AWS_BUCKET_NAME`: S3 access and target bucket.
- `AWS_CLOUDFRONT_DOMAIN`: optional delivery host for stored files.
- `BOOKING_UPLOAD_MAX_BYTES`, `BOOKING_UPLOAD_PART_BYTES`: multipart delivery
  upload limits.
- `S3_UPLOAD_URL_TTL_SECONDS`, `S3_DOWNLOAD_URL_TTL_SECONDS`: signed URL
  lifetimes.
- `FILE_UPLOAD_PATH`, `NEXT_PUBLIC_FILE_URL`: legacy/local file-serving paths
  used by older upload surfaces.

### Customer OTP and WhatsApp

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`: Twilio authentication.
- `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_OTP_CHANNEL`: Twilio Verify OTP mode.
- `TWILIO_WHATSAPP_FROM`, `TWILIO_MESSAGING_SERVICE_SID`: WhatsApp sender
  configuration.
- `TWILIO_WHATSAPP_WEBHOOK_URL`: exact public inbound WhatsApp webhook URL used
  for Twilio signature validation. Required in production for the inbound
  auto-reply endpoint.
- `CONTACT_WHATSAPP_TO`: destination for public contact requests.
- `WHATSAPP_BOOKING_PAGE_URL`, `WHATSAPP_MANAGE_BOOKING_URL`,
  `WHATSAPP_DASHBOARD_FILES_URL`: links included in notification messages.

### OAuth and GPT Actions

- `OAUTH_BASE_URL`, `OAUTH_ALLOWED_SCOPES`, `OAUTH_CALLBACK_URIS`: public OAuth
  protocol configuration.
- `OAUTH_INTERACTION_TTL_SECONDS`, `OAUTH_CODE_TTL_SECONDS`,
  `OAUTH_ACCESS_TOKEN_TTL_SECONDS`, `OAUTH_REFRESH_TOKEN_TTL_SECONDS`: OAuth
  artifact lifetimes.
- `OAUTH_TOKEN_HASH_PEPPER`, `OAUTH_CLIENT_SECRET_HASH_PEPPER`: server-only
  hashing secrets.

Safe development defaults exist for OAuth protocol settings. Production
requirements and provisioning are documented under
[`docs/gpt-actions-oauth/`](./gpt-actions-oauth/). OAuth secret variables must
never use a `NEXT_PUBLIC_` prefix.

### Background workers

- `CRON_SECRET`: authenticates internal worker requests.
- `INTERNAL_APP_URL`: base URL used by workers to call the Next.js application.

The configured processes are defined in
[`ecosystem.config.cjs`](../ecosystem.config.cjs). Exact production process and
host details belong only in `docs/private/PRODUCTION-DEPLOYMENT.md`.

## Optional local administrator

The superadmin seeder requires `SUPERADMIN_EMAIL`, `SUPERADMIN_PHONE`, and
`SUPERADMIN_PASSWORD`; `SUPERADMIN_FULL_NAME` is optional. After setting
development-only values, run only that seeder:

```bash
npx sequelize-cli db:seed --seed 20251029165410-create-superadmin.js
```

Do not run `npx sequelize-cli db:seed:all` without reviewing every seeder. The
repository also contains a historical seeder that deletes the stored pricing
configuration.

## Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build and catch integration/configuration errors. |
| `npm start` | Run an existing production build. |
| `npm test -- --runInBand` | Run Jest serially. |
| `npm run test:watch` | Run Jest in watch mode. |
| `npm run test:ci` | Run Jest with CI settings and coverage. |
| `npm run test:promotions:coverage` | Run the blocking focused promotion coverage gate. |
| `npm run test:promotions:postgres` | Run promotion migration and integration suites against a disposable PostgreSQL instance. |
| `npm run test:invoices:postgres` | Run invoice-number allocation concurrency proof against a disposable PostgreSQL instance. |
| `npm run test:invoices:coverage` | Run the blocking invoice-owned coverage gate (85% statements, 75% branches). |
| `npm run test:invoices:quality-gate-proof` | Prove the invoice coverage gate fails closed at an intentionally impossible threshold. |
| `npm run test:invoices:pdf` | Launch local Puppeteer Chromium for the synthetic invoice PDF smoke test; requires Poppler `pdfinfo` and `pdftotext`. |
| `npm run test:jest:full` | Run the full serial Jest baseline. |
| `npm run test:promotions:quality-gate-proof` | Safely verify that an intentional promotion coverage-threshold breach stops the gate. |
| `npm run cleanup:disposable-postgres` | Remove only reserved disposable PostgreSQL databases after a test run. |
| `npm run lint` | Run Biome checks without rewriting files. |
| `npm run format` | Rewrite supported files with Biome formatting. |
| `npm run verify:whatsapp-inbound-config` | Check the Twilio inbound auto-reply environment values before attaching the live webhook. |
| `npx sequelize-cli db:migrate` | Apply pending database migrations. |

OAuth provisioning, verification, and cleanup commands are listed in
[`package.json`](../package.json) and explained in the
[OAuth operations documentation](./gpt-actions-oauth/OPERATIONS.md).

The repository-wide Jest and Biome baselines are not currently green. Consult
[`docs/PROJECT-STATUS.md`](./PROJECT-STATUS.md) before interpreting failures;
do not report a green baseline unless the relevant commands actually pass.
Promotion CI commands, their synthetic test-only variables, and the separate
full-suite baseline policy are documented in
[`docs/promotions-management/SECURITY-TEST-PLAN.md`](./promotions-management/SECURITY-TEST-PLAN.md).

## Where to make changes

- Add or modify a page or route under `src/app/`.
- Put reusable presentation components under `src/components/`.
- Keep server-side use cases in `src/lib/actions/` or `src/lib/services/`, not
  in client components.
- Add Sequelize model changes with a migration under `src/lib/db/migrations/`.
- Add tests beside the affected area in its `__tests__` directory.
- Update relevant documentation and task evidence in the same change as the
  implementation.

See the [project overview](./PROJECT-OVERVIEW.md) for a fuller code map.

## Documentation maintenance

Repository-local documentation rules are defined in [`AGENTS.md`](../AGENTS.md)
and the [feature delivery playbook](./FEATURE-DELIVERY-PLAYBOOK.md). They are
part of the delivery process for multi-file, release-relevant, or feature-sized
work.

- Plan features and bounded tasks in GitHub Issues and use Project 1 as the
  authoritative workflow state and priority queue.
- Keep durable shipped behavior under `docs/<feature-slug>/` instead of
  scattering implementation knowledge through issue comments.
- Treat existing `TASKS.md` files as historical delivery ledgers, not live
  implementation trackers.
- Update issue/PR evidence and materially affected durable docs in the same
  change as the code.
- Record architecture or product decisions before implementing a changed
  direction.
- Update `docs/PROJECT-STATUS.md` when repository health or release posture
  materially changes.
- Keep exact live hostnames, paths, secret locations, credentials, and
  one-off production commands out of tracked files. Store them only in the
  ignored `docs/private/PRODUCTION-DEPLOYMENT.md` runbook.

The full feature document set is intentionally optional for small, isolated
fixes. Follow the playbook when the work spans multiple files, milestones,
production risk, or cross-functional decisions.
