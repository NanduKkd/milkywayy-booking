# Admin access control and Settings decisions

- Last updated: 2026-06-30

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| RBAC-D001 | Final roles are `SUPERADMIN`, `ADMIN`, `ACCOUNTS`, and `CUSTOMER`. | Legacy `TRANSPORT` and `SHOOT` roles are namesake-only and may be removed. |
| RBAC-D002 | Staff are managed only in Settings; Users is customer-only. | Customer operations and privileged identity administration require separate boundaries. |
| RBAC-D003 | Permission enforcement is server-side and deny-by-default. | Hidden navigation is not authorization. |
| RBAC-D004 | Super Admin always has full access and cannot be removed through the permission matrix. | The system requires a lockout-safe owner role. |
| RBAC-D005 | Admin and Accounts section permissions are persisted. | The prototype requires editable access levels that survive sessions and deployments. |
| RBAC-D006 | Legacy staff rows are disabled for review during migration instead of being automatically promoted. | Mapping a nominal old role to broad Admin access would be an unsafe privilege escalation. |
| RBAC-D007 | Invitations use expiring, single-use random tokens hashed at rest. | Email links are bearer credentials and require the same protections as password-reset tokens. |
| RBAC-D008 | An email provider will be integrated behind an adapter during this feature. | Provider coupling and secrets should not spread through domain logic. |
| RBAC-D009 | Last-Super-Admin demotion/deactivation is prohibited. | Prevents administrative lockout. |
| RBAC-D010 | Permission and staff lifecycle mutations produce security audit events. | High-impact administrative changes require traceability. |

## Initial role defaults

- Admin: Dashboard, Bookings, Calendar, Customers, Promotions, Time Slots,
  Pricing, Portfolio, and Reviews; no finance or Settings access by default.
- Accounts: Dashboard, Invoices, Reports, report exports, and Expenses; no
  operational or Settings access by default.
- Super Admin: all current and future permissions.

The persisted matrix may alter Admin and Accounts after initialization.

## Open provider decision

- Select the email provider, verified sender/domain, delivery-event mechanism,
  and local/test transport before RBAC-105 begins. Exact live values must remain
  outside tracked documentation.
