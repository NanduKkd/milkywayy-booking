# Milkywayy Booking

Milkywayy Booking is a Next.js platform for booking and delivering real-estate
media services. It includes a public website, customer booking and account
flows, an operations/admin portal, Stripe payments, delivery-file workflows,
Twilio/WhatsApp communication, and a read-only GPT Actions integration.

## Start here

- [Project overview](./docs/PROJECT-OVERVIEW.md): product surfaces, architecture, integrations, and code map.
- [Development guide](./docs/DEVELOPMENT.md): local setup, configuration, commands, and working conventions.
- [Project status](./docs/PROJECT-STATUS.md): current repository health and release posture.
- [Booking file delivery](./docs/booking-file-delivery/README.md): canonical delivery classifications, upload validation, and legacy replacement compatibility.
- [Customer property showcases](./docs/customer-property-sharing/README.md): stable public links, reference-matched management UI, inline showcase, and operations contract.
- [Pending tasks](./docs/PENDING-TASKS.md): unfinished work, decisions, and blockers.
- [Change verification guide](./docs/CHANGE-VERIFICATION.md): testing, evidence, review, and safety guidance.
- [Agent instructions](./AGENTS.md): repository-local rules for coding agents.

Repository files are authoritative for implemented truth.
`docs/PENDING-TASKS.md` records unfinished work and blockers. Existing feature
`TASKS.md` files, GitHub workflow records, and the previous Notion workspace are
historical archives only.

Exact production configuration remains only in ignored local `docs/private/`
runbooks and must not be copied into GitHub or tracked files.

## Technology

- Next.js App Router and React
- Sequelize and PostgreSQL
- Stripe
- AWS S3 with optional CloudFront delivery
- Twilio Verify and WhatsApp
- Tailwind CSS
- Jest and Biome

## Local development

Prerequisites: Node.js/npm and PostgreSQL.

```bash
npm ci
npx sequelize-cli db:migrate
npm run dev
```

Create an ignored `.env` with the required database and integration variables.
See the [development guide](./docs/DEVELOPMENT.md) for the configuration groups
and setup guidance.

Common checks:

```bash
npm test -- --runInBand
npm run lint
npm run build
```

Do not assume the repository-wide test/lint baseline is green. Check
[Project Status](./docs/PROJECT-STATUS.md) before interpreting failures.

## Repository map

| Path | Responsibility |
|---|---|
| `src/app/` | Pages, layouts, route handlers, and feature-local UI |
| `src/components/` | Shared public, customer, admin, and UI components |
| `src/lib/actions/` | Server actions |
| `src/lib/services/` | Domain workflows and reusable server-side use cases |
| `src/lib/db/` | Sequelize models, relations, migrations, and seeders |
| `src/lib/oauth/` | OAuth protocol and security logic |
| `src/contracts/` | Executable external contracts and their tests |
| `scripts/` | Workers and verification/provisioning utilities |
| `docs/` | Durable architecture, decisions, operations, security, and quality knowledge |
| `docs/private/` | Ignored local production and rollout details only |
