# Milkywayy Booking

Milkywayy Booking is a Next.js application for booking and delivering real
estate media services. It includes a public website, customer booking and
account flows, an operations/admin portal, delivery-file review workflows, and
a read-only GPT Actions integration.

The application uses the Next.js App Router and React, Sequelize with
PostgreSQL, Stripe, AWS S3, Twilio/WhatsApp, Tailwind CSS, Jest, and Biome.

## Documentation index

| Document | Use it for |
|---|---|
| [Project overview](./docs/PROJECT-OVERVIEW.md) | Product areas, architecture, integrations, domain model, and code map. |
| [Development guide](./docs/DEVELOPMENT.md) | Local setup, configuration, database commands, tests, and documentation maintenance. |
| [Project status](./docs/PROJECT-STATUS.md) | Current implementation coverage, repository health, and known failing checks. |
| [Feature delivery playbook](./docs/FEATURE-DELIVERY-PLAYBOOK.md) | Required planning, tracking, evidence, and documentation workflow for feature-sized work. |
| [GPT Actions OAuth](./docs/gpt-actions-oauth/README.md) | Feature contract and index for the OAuth and GPT resource API documentation. |
| [Admin panel UI refresh](./docs/admin-panel-ui-refresh/README.md) | New admin shell, login, Dashboard presentation, and visual migration of existing operational pages. |
| [Admin scheduling calendar](./docs/admin-scheduling-calendar/README.md) | Shared availability, booking calendar, calendar-only events, blocking, and admin-created bookings. |
| [Admin analytics and finance](./docs/admin-analytics-finance/README.md) | Revenue definitions, Dashboard analytics, Reports, exports, P&L, and expense tracking. |
| [Admin customer management](./docs/admin-user-management/README.md) | Customer-only Users page, aggregates, editing, and account deactivation. |
| [Promotions management](./docs/promotions-management/README.md) | Consolidated generic, personal, and automatic promotions with migration and precedence rules. |
| [Admin access control](./docs/admin-access-control/README.md) | Settings, staff roles, permission enforcement, invitations, email delivery, and legacy-role removal. |
| [Agent instructions](./AGENTS.md) | Repository-local rules for Codex and other coding agents. |
| [Private production runbook](./docs/private/PRODUCTION-DEPLOYMENT.md) | Local-only live deployment instructions. This file is intentionally ignored by Git. |

## Sources of truth

- `docs/PROJECT-STATUS.md` describes the current state of the repository.
- For a feature, its `README.md` defines the delivery contract and its
  `TASKS.md` is the authoritative progress tracker.
- `docs/FEATURE-DELIVERY-PLAYBOOK.md` defines how feature documentation must be
  created and kept in sync with implementation.
- `docs/private/PRODUCTION-DEPLOYMENT.md` contains exact live deployment
  details. Do not copy its hostnames, paths, credentials, or operator commands
  into tracked documentation.

Start with the [development guide](./docs/DEVELOPMENT.md) to run the application
locally.
