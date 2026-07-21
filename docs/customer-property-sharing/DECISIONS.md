# Customer property sharing decisions

## PROP-D001 — Keep the Files route and rename only visible customer language

- Status: `ACCEPTED`
- Decision: `/dashboard/files` remains canonical, including `fileId` query
  behavior and return paths. The dashboard tab and surface say Properties.
- Consequence: Existing bookmarks, GPT file links, notifications, downloads,
  revisions, and customer workflow links stay compatible.

## PROP-D002 — Model one property as one completed booking

- Status: `ACCEPTED`
- Decision: A shared property is a completed, non-cancelled, customer-owned
  booking with at least one accepted current delivery file.
- Consequence: In-progress, under-review, replacement-pending, cancelled, and
  other-customer bookings are never selectable.

## PROP-D003 — Support exactly single and master links

- Status: `ACCEPTED`
- Decision: A single link snapshots exactly one property. A master link
  snapshots at least two explicitly selected properties.
- Consequence: There are no agent, team, assignment, delegated booking, or
  agency-payment concepts in this feature.

## PROP-D004 — Snapshot exact immutable delivery versions

- Status: `ACCEPTED`
- Decision: Create, master update, and explicit refresh capture all and only the
  eligible current file-version pairs resolved by the server.
- Consequence: Later uploads never widen access automatically. Replaced,
  deleted, private, requested-change, superseded, and unselected members fail
  closed.

## PROP-D005 — Use hash-only bearer credentials and versioned receipts

- Status: `ACCEPTED`
- Decision: Share tokens have 256 bits of randomness; only SHA-256 digests are
  stored. Contact receipts are signed, PII-free, share/property scoped, and at
  most 24 hours old.
- Consequence: Create/rotate is the only time the owner can copy the plaintext
  URL. Rotation invalidates both the old token and prior credential-version
  receipts without deleting history.

## PROP-D006 — Collect exactly contact name and phone

- Status: `ACCEPTED`
- Decision: The per-property gate accepts no email, company, agent, message,
  notes, or marketing fields. Contacts expire after 90 days.
- Consequence: Contact records remain separate from aggregate analytics and are
  visible only to the owner while unexpired.

## PROP-D007 — Measure aggregate request views, not people

- Status: `ACCEPTED`
- Decision: Count successful public landing requests as link total, last-viewed
  time, and Dubai-day buckets.
- Consequence: The UI says request views. There is no unique-visitor claim,
  raw-event stream, identity, device, address, referrer, or attribution data.

## PROP-D008 — Fail closed and use uniform not-found responses

- Status: `ACCEPTED`
- Decision: Public and cross-owner boundaries reveal no existence distinction.
- Consequence: Missing, malformed, disabled, revoked, stale, cross-owner, and
  unselected references cannot be used for enumeration.
