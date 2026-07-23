# Customer property showcase security test plan

## Automated release gates

### Schema and contention

- Migration up/down creates/removes listing, stable-link, and selection tables
  in dependency-safe order.
- Schema contains no contact submission, receipt, visitor identity, media
  snapshot, daily analytics, revocation, or rotation state.
- Real PostgreSQL contention permits one single per owner/booking, one master
  per owner, and one listing per owner/booking.
- Concurrent total-view increments are lossless.

### Listing, ownership, eligibility, and current media

- Only the customer session owner can save/manage a listing or link.
- Every listing field is bounded, normalized, unknown-key rejecting, and safely
  rendered; contact phone produces valid `tel:` and WhatsApp URLs.
- Cancelled, incomplete, other-owner, and no-safe-media bookings are rejected.
- Master links require at least two explicit configured properties.
- Public media includes only accepted, non-deleted current browser-safe
  image/video versions and validated HTTPS 360 copy-links.
- Wrong-booking, unsafe, deleted, superseded, and unselected media fail closed.

### Token, public page, and inline media boundary

- Public IDs decode to 32 random bytes, persist as 43-character base64url
  values, and remain stable across reload and disable/re-enable.
- Malformed, unknown, disabled, wrong-property, unselected, and cross-owner
  scopes share the same public unavailable shape.
- Public DTO/HTML contains no persisted object URL, `/api/files/download`,
  `download` attribute, delivery manifest, buyer form, receipt, or cookie flow.
- Media routes revalidate the public ID, property selection, current file/version,
  current acceptance, supersession, safe MIME, and owned storage key.
- Successful inline responses provide accurate MIME, `nosniff`, no-store,
  noindex, referrer policy, range support, and no attachment disposition or
  redirect.
- 360 embed URLs require HTTPS, reject credentials/malformed values, render
  with no-referrer iframes selected through a text/icon media tile with no
  image thumbnail, and never enter the S3 media route.
- Successful page/collection renders count atomically; failed resolutions and
  media requests do not.

### Compatibility and UI

- The tab says Properties but links to `/dashboard/files`.
- The standalone sharing-management section is absent. Eligible completed
  FileList cards expose **Create Share Link**; existing shared cards expose
  contextual stable copy, edit, enable/disable, total views, and the actual
  Phone/Desktop public-page preview.
- Single showcase covers gallery switching, direct video selection without a
  Video Walkthrough action, iframe-based 360 viewing from the media strip
  without an image thumbnail, metadata chips, description, highlights, contact
  phone/WhatsApp actions, empty/error states, and branding.
- Master collection contains only selected cards and opens the full selected
  showcase under the same token with a back path.
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
390×844 evidence for contextual completed-project sharing, the listing dialog,
a single showcase/gallery, and a master collection plus selected-property
showcase. Record DOM/network checks for inline media and the absence of buyer
POSTs, receipt cookies, public downloads/attachments, authenticated download
calls, and persisted object URLs.

Verify disabled/unselected/current-media failures, stable re-enable behavior,
total-only views, and unchanged authenticated FileList/download behavior.
Redact public IDs, contact numbers, object URLs, customer/booking IDs, cookies,
hosts, and local environment details.
