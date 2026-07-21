# Customer property sharing

The customer dashboard exposes secure sharing inside the existing
`/dashboard/files` route. The visible tab and page language say **Properties**,
while the route, `fileId` deep links, authenticated downloads, copy-link files,
revisions, replacement states, review deadlines, and completion controls retain
their existing contracts.

An authenticated customer can create:

- one live single-property link for each eligible completed booking; and
- one live master link containing at least two explicitly selected eligible
  completed bookings.

A shareable property is a non-cancelled booking owned by the customer with
`PROJECT_COMPLETED`, a non-null completion time, and at least one accepted,
non-deleted delivery file with a current version. Creation, master updates, and
explicit refreshes snapshot the exact accepted current file versions at that
moment. Later files and replacements never enter a link automatically.

Public visitors see only the selected property context. Each property requires
exactly name and phone before its snapshotted file actions are revealed. The
owner can disable and re-enable a link, rotate its bearer credential, refresh
its snapshot, permanently revoke it, inspect aggregate request views, and read
unexpired contact submissions.

Analytics are deliberately aggregate-only: total successful landing requests,
last viewed time, and one Dubai-calendar count per day. They are request views,
not unique people. No raw view-event or visitor-identity store exists.

Continue with [architecture](./ARCHITECTURE.md), [accepted decisions](./DECISIONS.md),
[operations](./OPERATIONS.md), the [security test plan](./SECURITY-TEST-PLAN.md),
and the [sanitized issue #68 browser proof](./proof/issue-68/README.md).

## Scope boundaries

This feature does not add agents, teams, assignment, delegated bookings,
payments, public invoices, CRM export, messages, email fields, marketing fields,
unique-visitor measurement, referral attribution, or third-party analytics. It
does not add `/dashboard/properties` or change the authenticated delivery-file
contract.
