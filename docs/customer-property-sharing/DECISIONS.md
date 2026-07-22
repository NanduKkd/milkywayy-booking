# Customer property showcase decisions

## PROP-D001 — Keep the Files route and authenticated delivery contract

- Status: `ACCEPTED`
- Decision: `/dashboard/files` remains canonical, including `fileId` behavior.
  The dashboard tab and management surface say Properties, and the complete
  authenticated `FileList` remains on the page.
- Consequence: Existing bookmarks, downloads, copy-link delivery, revisions,
  replacements, review deadlines, completion, and workflow links stay intact.

## PROP-D002 — Model one listing as one owned completed booking

- Status: `ACCEPTED`
- Decision: Listing configuration is unique by owner+booking and is available
  only for completed, non-cancelled, owner-owned bookings with safe accepted
  current media.
- Consequence: There is no agent assignment, team, delegated owner, or visitor
  contact record.

## PROP-D003 — Support exactly single and master links

- Status: `ACCEPTED`
- Decision: A single link selects exactly one configured property. A master
  selects at least two explicit configured properties in stable order.
- Consequence: A visitor cannot widen a master collection by changing a query
  parameter.

## PROP-D004 — Snapshot exact immutable media versions

- Status: `ACCEPTED`
- Decision: Create, master update, and explicit refresh capture only supported
  accepted current delivery-file/version pairs.
- Consequence: Later uploads never widen access automatically. Deleted,
  replaced, superseded, changes-requested, unsafe, and unselected files fail
  closed.

## PROP-D005 — Use hash-only bearer credentials

- Status: `ACCEPTED`
- Decision: Tokens have 256 bits of randomness and only SHA-256 digests persist.
- Consequence: Create/rotate is the only plaintext URL response; rotation makes
  the old bearer fail immediately without resetting analytics.

## PROP-D006 — Present a listing, never a delivery portal or lead gate

- Status: `ACCEPTED`
- Decision: Buyers immediately see gallery, listing metadata, description,
  highlights, and owner-authored telephone/WhatsApp actions.
- Consequence: There is no buyer form, contact POST/table/retention, receipt,
  cookie/JWT, public manifest, download button, or public attachment route.

## PROP-D007 — Stream authorized media inline

- Status: `ACCEPTED`
- Decision: Public photo/video/360 content crosses only a bearer + selected
  property + exact snapshot membership route with byte-range support.
- Consequence: Persisted object URLs, authenticated download endpoints,
  attachment disposition, and download attributes remain outside public HTML.

## PROP-D008 — Measure aggregate requests and fail uniformly

- Status: `ACCEPTED`
- Decision: Count successful showcase/collection requests as link total,
  last-viewed time, and Dubai-day buckets; all invalid scopes share one generic
  unavailable result.
- Consequence: There is no unique-visitor claim or visitor identity, and public
  state cannot be enumerated through differentiated failures.
