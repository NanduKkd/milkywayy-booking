# Admin access control and Settings task tracker

- Last updated: 2026-06-30
- Overall implementation status: `NOT_STARTED`
- Current milestone: `M0 - Permission and migration contract`

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Permission and migration contract | `IN_PROGRESS` | 0 | 4 | 2-3 days |
| M1 - Access-control foundation | `NOT_STARTED` | 0 | 7 | 6-8 days |
| M2 - Settings and enforcement audit | `NOT_STARTED` | 0 | 6 | 8-11 days |
| M3 - Security verification and rollout | `NOT_STARTED` | 0 | 6 | 5-7 days |

## M0 - Permission and migration contract

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-001 | Approve final role set and staff/customer separation | `IN_REVIEW` | Product / Engineering | None | Roles are `SUPERADMIN`, `ADMIN`, `ACCOUNTS`, and `CUSTOMER`; staff live in Settings only | Pending |
| RBAC-002 | Inventory every admin route, API, and server action | `NOT_STARTED` | Engineering | RBAC-001 | Each boundary has a required permission and current enforcement state | Pending |
| RBAC-003 | Define legacy staff migration and lockout safeguards | `NOT_STARTED` | Engineering | RBAC-001 | Legacy role rows, zero-superadmin prevention, and rollback behavior are explicit | Pending |
| RBAC-004 | Select email provider and acceptance flow | `NOT_STARTED` | Product / Engineering | None | Provider, sender configuration, failure behavior, and invite URL contract are approved | Pending |

## M1 - Access-control foundation

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-101 | Add staged role migration | `NOT_STARTED` | Engineering | RBAC-003 | New roles are added, legacy rows safely migrated, defaults corrected, and old enum values removed only after verification | Pending |
| RBAC-102 | Add role-permission persistence | `NOT_STARTED` | Engineering | RBAC-001 | Admin and Accounts section permissions persist; Super Admin remains immutable full access | Pending |
| RBAC-103 | Implement central permission service | `NOT_STARTED` | Engineering | RBAC-102 | Pages, actions, and routes share deny-by-default permission checks | Pending |
| RBAC-104 | Add invitation persistence and secure token service | `NOT_STARTED` | Engineering | RBAC-004 | Tokens are random, hashed, single-use, expiring, revocable, and actor-attributed | Pending |
| RBAC-105 | Add email-provider adapter | `NOT_STARTED` | Engineering | RBAC-004 | Invite delivery is isolated behind a tested adapter and secrets remain outside tracked files | Pending |
| RBAC-106 | Implement invite acceptance and staff activation | `NOT_STARTED` | Engineering | RBAC-104, RBAC-105 | Valid recipients establish credentials/account state once; invalid/reused/expired tokens fail safely | Pending |
| RBAC-107 | Add security audit events | `NOT_STARTED` | Engineering | RBAC-103, RBAC-104 | Permission changes, invites, resend, revoke, acceptance, role changes, and activation are logged safely | Pending |

## M2 - Settings and enforcement audit

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-201 | Build Settings role summaries and permission matrix | `NOT_STARTED` | Engineering | RBAC-102 | Matrix edits persist, validate, and cannot reduce Super Admin access | Pending |
| RBAC-202 | Build staff list and lifecycle controls | `NOT_STARTED` | Engineering | RBAC-106 | Staff can be invited, resent, revoked, activated/deactivated, and role-changed with confirmations | Pending |
| RBAC-203 | Make admin navigation permission-aware | `NOT_STARTED` | Engineering | RBAC-103 | Hidden sections match server enforcement but do not replace it | Pending |
| RBAC-204 | Enforce permissions on all admin pages | `NOT_STARTED` | Engineering | RBAC-002, RBAC-103 | Direct route access is denied consistently with a safe response | Pending |
| RBAC-205 | Enforce permissions on all APIs and server actions | `NOT_STARTED` | Engineering | RBAC-002, RBAC-103 | Every mutation and sensitive read denies missing permissions server-side | Pending |
| RBAC-206 | Remove legacy role assumptions and Users exposure | `NOT_STARTED` | Engineering | RBAC-101, RBAC-204, customer-management contract | No `TRANSPORT`/`SHOOT` references or non-customer-is-admin shortcuts remain | Pending |

## M3 - Security verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| RBAC-301 | Add permission matrix and direct-access tests | `NOT_STARTED` | Engineering | M2 | Every role/section/read/write combination has allow and deny coverage | Pending |
| RBAC-302 | Add invitation security tests | `NOT_STARTED` | Engineering | RBAC-106 | Expiration, reuse, tampering, enumeration, resend, revoke, and provider failure cases pass | Pending |
| RBAC-303 | Add migration and Super Admin lockout tests | `NOT_STARTED` | Engineering | RBAC-101 | Legacy data migrates safely and the last Super Admin cannot be disabled or demoted | Pending |
| RBAC-304 | Run manual cross-role security verification | `NOT_STARTED` | Security / Engineering | RBAC-301, RBAC-302 | Super Admin, Admin, Accounts, Customer, anonymous, and disabled-account checks are recorded | Pending |
| RBAC-305 | Stage role and permission rollout | `NOT_STARTED` | Engineering / Operations | RBAC-301 to RBAC-304 | Schema, compatibility, enforcement, and cleanup phases have rollback gates | Pending |
| RBAC-306 | Verify email delivery and monitor invitation lifecycle | `NOT_STARTED` | Engineering / Operations | RBAC-302, RBAC-305 | Delivery, bounce/failure handling, acceptance, and audit telemetry are verified | Pending |
