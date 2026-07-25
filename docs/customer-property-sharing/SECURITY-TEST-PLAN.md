# Customer property showcase security test plan

## Automated release gates

### Schema and contention

- Migration up/down creates/removes listing, stable-link, and selection tables
  in dependency-safe order.
- Snapshot migration creates exact property+file+version membership with unique
  property/file and property/position constraints.
- Schema contains no contact submission, receipt, visitor identity, daily
  analytics, revocation, or rotation state.
- Real PostgreSQL contention permits one single per owner/booking, one master
  per owner, and one listing per owner/booking.
- Concurrent total-view increments are lossless.

### Listing, ownership, eligibility, and current media

- Only the customer session owner can save/manage a listing or link.
- Every listing field is bounded, normalized, unknown-key rejecting, and safely
  rendered; contact phone produces valid `tel:` and WhatsApp URLs.
- Confirmed non-cancelled owner bookings become eligible with the first safe
  current under-review or accepted file; draft, cancelled, other-owner,
  private-only, changes-requested-only, and unsafe-only bookings are rejected.
- Master links require at least two explicit configured properties.
- New/explicitly refreshed snapshots include all safe current under-review and
  accepted browser-safe image/video versions and validated HTTPS 360
  copy-links across service types.
- Wrong-booking, unsafe, deleted, stale, superseded, changes-requested, and
  unselected media fail closed.

### Token, public page, and inline media boundary

- Public IDs decode to 32 random bytes, persist as 43-character base64url
  values, and remain stable across reload and disable/re-enable.
- Malformed, unknown, disabled, wrong-property, unselected, and cross-owner
  scopes share the same public unavailable shape.
- Public DTO/HTML contains no persisted object URL, `/api/files/download`,
  `download` attribute, delivery manifest, buyer form, receipt, or cookie flow.
- Media routes revalidate the public ID, property selection, exact snapshot
  membership, current file/version, under-review/accepted state, supersession,
  safe MIME, and owned storage key.
- Successful inline responses provide accurate MIME, `nosniff`, no-store,
  noindex, referrer policy, range support, and no attachment disposition or
  redirect.
- Preview routes repeat token/property/current-snapshot authorization with an
  image-only requirement and owned-key-to-booking match; video, tour,
  cross-booking, stale, disabled, and unselected requests share the generic
  unavailable response.
- Preview tests verify a 1200×630 `image/jpeg`, declared Open Graph URL/type/
  dimensions/alt, no view increment, no persisted URL or redirect, private
  no-store headers, declared and streamed source-byte caps, S3-size failures,
  malformed input, decoded-pixel limits, deadline handling, and output-byte
  ceiling.
- 360 embed URLs require HTTPS, reject credentials/malformed values, render
  with no-referrer iframes selected through a text/icon media tile with no
  image thumbnail, and never enter the S3 media route.
- Successful page/collection renders count atomically; failed resolutions and
  media requests do not.
- Dynamic property metadata uses the listing title and description, canonical
  represented share URL, and first ordered token-scoped reduced JPEG preview
  without exposing a persisted object URL or incrementing the link view total.

### Compatibility and UI

- The tab says Properties but links to `/dashboard/files`.
- Eligible unshared FileList create action, compact listing form, Shared
  Properties, Master Links, direct check-control selection, select-multiple
  action bar, total views, stable copy, enable/disable, explicit media refresh,
  and the actual Phone/Desktop public-page preview are covered by focused
  component tests. The in-review FileList create action is additionally
  captured at desktop and 390px widths.
- A successful FileList share creation reconciles the refreshed server state
  into Shared Properties immediately and removes the duplicate create action
  without requiring a manual browser refresh.
- Single showcase covers gallery switching, direct video selection without a
  Video Walkthrough action, iframe-based 360 viewing from the media strip
  without an image thumbnail, metadata chips, description, highlights, contact
  phone/WhatsApp actions, empty/error states, and branding.
- Master collection contains only selected cards and opens the full selected
  showcase under the same token with a spaced back path. The collection root is
  edge-to-edge with no outer card treatment or repeated contact card.
- Existing `fileId`, authenticated download/copy-link, revisions, replacements,
  review deadlines, completion, and other dashboard product areas retain
  focused compatibility coverage.

## Required commands

Run the focused issue #68 suites, reserved disposable-PostgreSQL suite,
dashboard/delivery compatibility suites named in the issue, production build,
changed-file Biome, `git diff --check`, and practical repo-wide baselines.
Record exact suite/test counts and separate unrelated baseline failures.

## Sanitized browser proof

Use synthetic listings, media, contacts, and bearers. Capture 1440×900 and
390×844 evidence for Shared management, FileList creation, listing form,
select-multiple and master-link management, the unchanged delivery controls, a
single showcase/gallery, and an edge-to-edge master collection plus spaced
selected-property back path. Record DOM/network checks for inline media and the
absence of buyer POSTs, receipt cookies, public downloads/attachments,
collection-level contact actions, authenticated download calls, and persisted
object URLs.

Verify disabled/unselected/current-media failures, stable re-enable behavior,
total-only views, and unchanged authenticated FileList/download behavior.
Redact public IDs, contact numbers, object URLs, customer/booking IDs, cookies,
hosts, and local environment details.
