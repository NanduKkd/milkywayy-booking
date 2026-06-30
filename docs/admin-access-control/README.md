# Admin access control and Settings delivery plan

- Last updated: 2026-07-01
- Planning status: `DEFERRED`
- Implementation status: `DEFERRED`
- Target: deferred for a later release; secure staff administration, editable section permissions, invitations, and consistent server-side enforcement remain the intended scope when work resumes.

## Purpose

Create the complete Settings feature and replace the current inconsistent
“non-customer is admin” behavior with explicit staff roles and permissions.
Staff accounts move out of Users and are managed only in Settings.

## Current status

This feature is on hold and has been deferred to a later release.
No implementation work should start against this folder until the feature is
reactivated and the task tracker is updated.

## Document index

- [TASKS.md](./TASKS.md): authoritative tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): roles, permissions, invitations, and enforcement.
- [DECISIONS.md](./DECISIONS.md): role migration and security decisions.
- [OPERATIONS.md](./OPERATIONS.md): staged database and provider rollout.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): mandatory authorization and invitation gates.

## Status model

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | A dependency or decision prevents progress. |
| `IN_REVIEW` | Work awaits verification. |
| `DONE` | Acceptance criteria and evidence are complete. |
| `DEFERRED` | Removed from this release. |

## Initial scope

- Staff-only Settings page with Super Admin, Admin, and Accounts role summaries.
- Section permission matrix persisted in the database.
- Server-side permission checks for every in-scope admin page, server action, and API.
- Staff list, invitation creation, email delivery, resend, revoke, expiration, acceptance, and activation.
- Migration from `SUPERADMIN`, `TRANSPORT`, `SHOOT`, and `CUSTOMER` to `SUPERADMIN`, `ADMIN`, `ACCOUNTS`, and `CUSTOMER`.
- Removal of legacy `TRANSPORT` and `SHOOT` enum values after data migration and verification.
- Staff exclusion from customer Users queries.
- Security logging for permission and invitation changes.

## Explicit non-goals

- Custom per-person permissions in the first release; permissions attach to Admin and Accounts roles.
- Customer invitation or marketing-email workflows.
- Storing email-provider credentials or live deployment details in tracked documentation.

## Dependencies

- An email delivery provider selected and connected during implementation.
- Existing session, proxy, auth helper, admin APIs, and server actions.
- All other admin feature folders depend on this feature’s permission service.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Permission and migration contract | 2-3 engineering days |
| M1 - Role, permission, invitation, and email foundation | 6-8 engineering days |
| M2 - Settings UI and full enforcement audit | 8-11 engineering days |
| M3 - Security verification and staged rollout | 5-7 engineering days |

## Completion definition

- No admin authorization decision relies only on hidden navigation or client state.
- Super Admin always retains full access and cannot be locked out by the matrix.
- Admin and Accounts access exactly the persisted sections and corresponding server operations.
- Legacy role values are absent only after legacy rows and all code references are migrated.
- Invitation tokens are single-use, expiring, hashed at rest, and delivered through the configured provider.
- Staff are visible in Settings and never in the customer Users page.
