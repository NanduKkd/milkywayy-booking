# Customer property showcase decisions

## PROP-D001 — Keep the Files route and authenticated delivery contract

- Status: `ACCEPTED`
- Decision: `/dashboard/files` remains canonical without targeted `fileId`
  query behavior. The dashboard tab and management surface say Properties, and the complete
  authenticated `FileList` remains on the page below the sharing controls.
- Consequence: Existing bookmarks, downloads, copy-link delivery, revisions,
  replacements, review deadlines, completion, and workflow links stay intact.

## PROP-D002 — Model one listing as one owned confirmed booking

- Status: `ACCEPTED`
- Decision: Listing configuration is unique by owner+booking and is available
  for confirmed, non-cancelled, owner-owned bookings with safe current media
  under review or accepted; completion is not required.
- Consequence: There is no agent assignment, team, delegated owner, or visitor
  contact record.

## PROP-D003 — Support exactly single and master links

- Status: `ACCEPTED`
- Decision: A single link selects exactly one configured property. A master
  selects at least two explicit configured properties in stable order.
- Consequence: A visitor cannot widen a master collection by changing a query
  parameter.

## PROP-D004 — Synchronize exact safe reviewable media

- Status: `ACCEPTED`
- Decision: Active links automatically pin every supported current
  under-review or accepted delivery-file/version pair for each selected
  booking. Property-level logical-file preferences control order, visibility,
  and cover choice across all links.
- Consequence: New media appends visibly and replacement versions inherit
  preferences. Deleted, stale, superseded, changes-requested, unsafe, hidden,
  and unselected files fail closed. There is no manual Refresh Media action.

## PROP-D005 — Use stable opaque public identifiers

- Status: `ACCEPTED`
- Decision: Public IDs have 256 bits of randomness and persist so the same URL
  can be copied after reload.
- Consequence: Links are deliberately public and reshareable. Owners can only
  disable/re-enable them; there is no rotation, revocation, expiry, or
  one-time-copy state.

## PROP-D006 — Present a listing, never a delivery portal or lead gate

- Status: `ACCEPTED`
- Decision: Buyers immediately see gallery, listing metadata, description,
  highlights, and owner-authored telephone/WhatsApp actions.
- Consequence: There is no buyer form, contact POST/table/retention, receipt,
  cookie/JWT, public manifest, download button, or public attachment route.

## PROP-D007 — Stream owned media and embed 360 tours inline

- Status: `ACCEPTED`
- Decision: Public photos and videos cross only a bearer + selected property +
  current accepted file route with byte-range support. Accepted HTTPS 360
  copy-links render as no-referrer iframes in the main viewer, selected through
  a text/icon media-strip tile with no image thumbnail.
- Consequence: Persisted object URLs, authenticated download endpoints,
  attachment disposition, and download attributes remain outside public HTML.
  External 360 embed URLs are intentionally public and never enter the owned
  object route.

## PROP-D008 — Count total link views and fail uniformly

- Status: `ACCEPTED`
- Decision: Count successful showcase/collection requests only as a link total;
  all invalid scopes share one generic unavailable result.
- Consequence: There is no unique-visitor claim or visitor identity, and public
  state cannot be enumerated through differentiated failures.

## PROP-D009 — Match the supplied reference interaction and visual contract

- Status: `ACCEPTED`
- Decision: Properties uses the reference's compact Shared, Master,
  listing-form, action-bar, and buyer-showcase patterns. Eligible unshared
  confirmed projects expose **Create Share Link** in the authenticated FileList
  as soon as safe media is under review. A shared card opens the real public
  page in a Phone/Desktop preview.
- Consequence: Extra explanatory headers, rotation/revocation controls,
  substitute preview markup, agent assignment, and team controls are outside
  the product contract. The authenticated delivery-file list remains available
  below the reference-style property-sharing manager.

## PROP-D010 — Keep collection chrome edge-to-edge and property-specific

- Status: `ACCEPTED`
- Decision: The public master collection occupies the browser bounds without an
  outer card margin, border, radius, or shadow. Collection cards remain compact,
  while contact actions appear only inside each property's full showcase.
- Consequence: A master landing does not repeat a collection-level contact card.
  The selected-property back path retains clear inset spacing above the full
  showcase.

## PROP-D011 — Keep listing facts bounded and booking-aware

- Status: `ACCEPTED`
- Decision: Persist property type, fractional bathrooms, maid's room, built-up
  area, and plot area. Bedrooms remain booking-derived and price per ft² is
  derived. Commercial listings clear bathrooms and maid's room server-side and
  omit all residential room chips publicly.
- Consequence: Client input cannot overwrite booking bedrooms or introduce
  duplicate workflow facts.

## PROP-D012 — Copy reusable contacts and persist logical media preferences

- Status: `ACCEPTED`
- Decision: Saved contacts are owner-scoped and normalized by phone; selection
  copies values into the listing. Media preferences are stored at
  owner+booking+logical-file scope rather than per public link.
- Consequence: Editing or deleting a preset never silently changes listing
  contact snapshots, and single/master links share media presentation choices.
