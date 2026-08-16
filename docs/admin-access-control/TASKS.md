# Admin access control and Settings task tracker

> Historical delivery ledger. This file preserves migration evidence and is not a current project-status record.

- Last updated: 2026-07-01
- Overall implementation status: `DEFERRED`
- Current milestone: `DEFERRED`

## Hold status

This feature has been put on hold and deferred to a later release.
Leave all implementation tasks in `DEFERRED` until work is explicitly resumed.

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Permission and migration contract | `DEFERRED` | 0 | 4 | 2-3 days |
| M1 - Access-control foundation | `DEFERRED` | 0 | 7 | 6-8 days |
| M2 - Settings and enforcement audit | `DEFERRED` | 0 | 6 | 8-11 days |
| M3 - Security verification and rollout | `DEFERRED` | 0 | 6 | 5-7 days |

## M0 - Permission and migration contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-001 | Approve final role set and staff/customer separation | `DEFERRED` | Product / Engineering | None | Roles are `SUPERADMIN`, `ADMIN`, `ACCOUNTS`, and `CUSTOMER`; staff live in Settings only | Deferred on 2026-07-01; feature put on hold |
| RBAC-002 | Inventory every admin route, API, and server action | `DEFERRED` | Engineering | RBAC-001 | Each boundary has a required permission and current enforcement state | Deferred on 2026-07-01; feature put on hold |
| RBAC-003 | Define legacy staff migration and lockout safeguards | `DEFERRED` | Engineering | RBAC-001 | Legacy role rows, zero-superadmin prevention, and rollback behavior are explicit | Deferred on 2026-07-01; feature put on hold |
| RBAC-004 | Select email provider and acceptance flow | `DEFERRED` | Product / Engineering | None | Provider, sender configuration, failure behavior, and invite URL contract are approved | Deferred on 2026-07-01; feature put on hold |

## M1 - Access-control foundation

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-101 | Add staged role migration | `DEFERRED` | Engineering | RBAC-003 | New roles are added, legacy rows safely migrated, defaults corrected, and old enum values removed only after verification | Deferred on 2026-07-01; feature put on hold |
| RBAC-102 | Add role-permission persistence | `DEFERRED` | Engineering | RBAC-001 | Admin and Accounts section permissions persist; Super Admin remains immutable full access | Deferred on 2026-07-01; feature put on hold |
| RBAC-103 | Implement central permission service | `DEFERRED` | Engineering | RBAC-102 | Pages, actions, and routes share deny-by-default permission checks | Deferred on 2026-07-01; feature put on hold |
| RBAC-104 | Add invitation persistence and secure token service | `DEFERRED` | Engineering | RBAC-004 | Tokens are random, hashed, single-use, expiring, revocable, and actor-attributed | Deferred on 2026-07-01; feature put on hold |
| RBAC-105 | Add email-provider adapter | `DEFERRED` | Engineering | RBAC-004 | Invite delivery is isolated behind a tested adapter and secrets remain outside tracked files | Deferred on 2026-07-01; feature put on hold |
| RBAC-106 | Implement invite acceptance and staff activation | `DEFERRED` | Engineering | RBAC-104, RBAC-105 | Valid recipients establish credentials/account state once; invalid/reused/expired tokens fail safely | Deferred on 2026-07-01; feature put on hold |
| RBAC-107 | Add security audit events | `DEFERRED` | Engineering | RBAC-103, RBAC-104 | Permission changes, invites, resend, revoke, acceptance, role changes, and activation are logged safely | Deferred on 2026-07-01; feature put on hold |

## M2 - Settings and enforcement audit

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-201 | Build Settings role summaries and permission matrix | `DEFERRED` | Engineering | RBAC-102 | Matrix edits persist, validate, and cannot reduce Super Admin access | Deferred on 2026-07-01; feature put on hold |
| RBAC-202 | Build staff list and lifecycle controls | `DEFERRED` | Engineering | RBAC-106 | Staff can be invited, resent, revoked, activated/deactivated, and role-changed with confirmations | Deferred on 2026-07-01; feature put on hold |
| RBAC-203 | Make admin navigation permission-aware | `DEFERRED` | Engineering | RBAC-103 | Hidden sections match server enforcement but do not replace it | Deferred on 2026-07-01; feature put on hold |
| RBAC-204 | Enforce permissions on all admin pages | `DEFERRED` | Engineering | RBAC-002, RBAC-103 | Direct route access is denied consistently with a safe response | Deferred on 2026-07-01; feature put on hold |
| RBAC-205 | Enforce permissions on all APIs and server actions | `DEFERRED` | Engineering | RBAC-002, RBAC-103 | Every mutation and sensitive read denies missing permissions server-side | Deferred on 2026-07-01; feature put on hold |
| RBAC-206 | Remove legacy role assumptions and Users exposure | `DEFERRED` | Engineering | RBAC-101, RBAC-204, customer-management contract | No `TRANSPORT`/`SHOOT` references or non-customer-is-admin shortcuts remain | Deferred on 2026-07-01; feature put on hold |

## M3 - Security verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-301 | Add permission matrix and direct-access tests | `DEFERRED` | Engineering | M2 | Every role/section/read/write combination has allow and deny coverage | Deferred on 2026-07-01; feature put on hold |
| RBAC-302 | Add invitation security tests | `DEFERRED` | Engineering | RBAC-106 | Expiration, reuse, tampering, enumeration, resend, revoke, and provider failure cases pass | Deferred on 2026-07-01; feature put on hold |
| RBAC-303 | Add migration and Super Admin lockout tests | `DEFERRED` | Engineering | RBAC-101 | Legacy data migrates safely and the last Super Admin cannot be disabled or demoted | Deferred on 2026-07-01; feature put on hold |
| RBAC-304 | Run manual cross-role security verification | `DEFERRED` | Security / Engineering | RBAC-301, RBAC-302 | Super Admin, Admin, Accounts, Customer, anonymous, and disabled-account checks are recorded | Deferred on 2026-07-01; feature put on hold |
| RBAC-305 | Stage role and permission rollout | `DEFERRED` | Engineering / Operations | RBAC-301 to RBAC-304 | Schema, compatibility, enforcement, and cleanup phases have rollback gates | Deferred on 2026-07-01; feature put on hold |
| RBAC-306 | Verify email delivery and monitor invitation lifecycle | `DEFERRED` | Engineering / Operations | RBAC-302, RBAC-305 | Delivery, bounce/failure handling, acceptance, and audit telemetry are verified | Deferred on 2026-07-01; feature put on hold |
