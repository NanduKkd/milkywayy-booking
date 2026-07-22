# Customer property showcase security test plan

## Automated release gates

### Schema and contention

- Migration up/down creates/removes listing, link, selection, exact media
  membership, and aggregate tables in dependency-safe order.
- Schema contains no contact submission, receipt, visitor identity, or
  plaintext bearer field.
- Real PostgreSQL contention permits one live single per owner/booking, one
  live master per owner, and one listing per owner/booking.
- Concurrent total/Dubai-day increments are lossless.

### Listing, ownership, eligibility, and snapshots

- Only the customer session owner can save/manage a listing or link.
- Every listing field is bounded, normalized, unknown-key rejecting, and safely
  rendered; contact phone produces valid `tel:` and WhatsApp URLs.
- Cancelled, incomplete, other-owner, and no-safe-media bookings are rejected.
- Master links require at least two explicit configured properties.
- Snapshots include only accepted, non-deleted current browser-safe image/video
  versions and never auto-add later media.
- Wrong-booking, unsafe, deleted, replaced, superseded, unselected, and stale
  memberships fail closed.

### Token, public page, and inline media boundary

- Tokens decode to 32 random bytes and only a 64-character digest reaches
  persistence; rotation changes the digest and preserves aggregates.
- Malformed, unknown, disabled, revoked, stale, wrong-property, unselected, and
  cross-owner scopes share the same public unavailable shape.
- Public DTO/HTML contains no persisted object URL, `/api/files/download`,
  `download` attribute, delivery manifest, buyer form, receipt, or cookie flow.
- Media routes revalidate token, property selection, exact file/version,
  current acceptance, supersession, safe MIME, and owned storage key.
- Successful inline responses provide accurate MIME, `nosniff`, no-store,
  noindex, referrer policy, range support, and no attachment disposition or
  redirect.
- Successful page/collection renders count atomically; failed resolutions and
  media requests do not.

### Compatibility and UI

- The tab says Properties but links to `/dashboard/files`.
- Ready to Share, listing form, Shared Properties, Master Links,
  select-multiple/action bar, preview, analytics, enable/disable, refresh,
  rotation, and revoke are covered at desktop and narrow sizes.
- Single showcase covers gallery switching, metadata chips, description,
  highlights, contact phone/WhatsApp actions, empty/error states, and branding.
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
390×844 evidence for authenticated management, a single showcase/gallery, and
a master collection plus selected-property showcase. Record DOM/network checks
for inline media and the absence of buyer POSTs, receipt cookies, public
downloads/attachments, authenticated download calls, and persisted object URLs.

Verify disabled/old-rotated/unselected/stale failures, aggregate-only analytics,
and unchanged authenticated FileList/download behavior. Redact bearer tokens,
contact numbers, object URLs, customer/booking IDs, cookies, hosts, and local
environment details.
