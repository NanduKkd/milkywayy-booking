# Admin customer management decisions

- Last updated: 2026-06-30

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| USR-D001 | Users lists only `CUSTOMER` accounts. | Staff identities and permissions belong to Settings. |
| USR-D002 | Customer removal is deactivation, never hard deletion. | Bookings, payments, invoices, wallet, files, and audit history must remain referentially intact. |
| USR-D003 | Deactivation applies to existing as well as new access. | Leaving an existing session or OAuth token usable would make the control ineffective. |
| USR-D004 | Aggregation, filtering, sorting, and pagination are server-side. | Client-side loading of all customers will not scale and could expose unnecessary PII. |
| USR-D005 | Net spend reuses the finance revenue definition. | Users and Reports must not disagree on customer value. |
| USR-D006 | Users cannot change account roles. | Customer-to-staff promotion is a privileged Settings workflow. |
| USR-D007 | Deactivation and reactivation require authorization and audit evidence. | Account lifecycle actions affect authentication and sensitive customer access. |

## Deferred scope

- Bulk customer lifecycle actions.
- Marketing segments and mailing lists.
- Permanent erasure workflows; legal erasure would require a separate retention
  and anonymization design.
