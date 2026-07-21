# Customer property sharing security test plan

## Automated release gates

### Schema and concurrency

- Migration up/down creates and removes all tables, foreign keys, checks,
  cleanup/read indexes, token uniqueness, and partial live-link constraints in
  dependency-safe order.
- Real PostgreSQL contention uses the reserved-name disposable harness with
  explicit test-admin opt-in, and permits only one live single owner/property
  link and one live master owner link.
- Concurrent total and daily-bucket increments are lossless.
- Model registry and relations expose all five persistence boundaries.

### Ownership, eligibility, and snapshots

- Only the session owner reaches create/read/update/disable/rotate/revoke.
- Missing and cross-owner operations share one safe not-found result.
- Cancelled, incomplete, uncompleted, other-owner, and no-eligible-file
  bookings are rejected.
- Single links contain one property; master links require at least two explicit
  selections.
- Snapshots contain only accepted, non-deleted current versions and never add a
  later file automatically.
- Private, changes-requested, deleted, replaced, superseded, wrong-booking,
  unselected, and stale members fail closed.

### Token, receipt, and public boundary

- Tokens decode to 32 random bytes and only a 64-character SHA-256 digest is
  passed to persistence.
- Create/rotate returns plaintext once; rotation changes the digest and
  credential version without resetting aggregates.
- Malformed, unknown, disabled, revoked, stale, and unselected scopes have the
  same public 404 shape and do not count a landing.
- Receipts contain no PII, are HttpOnly/SameSite=Lax/Secure in production,
  share/property/version scoped, and invalid after 24 hours or rotation.
- Contact JSON accepts exactly name and phone, normalizes safely, rejects
  unknown/oversized/malformed input, and requires same-origin POSTs.
- Throttling is bounded and retains only expiring keyed digests in process
  memory.
- Public HTML/JSON contains no stored delivery URL. File actions revalidate the
  token, receipt, selection, file, pinned version, current version, eligibility,
  and owned storage key before delivery capped at five minutes or the lower
  configured TTL.
- Public responses set noindex, no-referrer, no-store/private, and nosniff
  protections.

### Compatibility and UI

- The tab says Properties but links to `/dashboard/files`.
- Owned `fileId` values still highlight/scroll; malformed, inaccessible, and
  other-owner values retain one generic notice.
- Existing native download, authenticated `copy_link`, revision limits and
  deadlines, replacement hiding/count/status, delivery progress, manual and
  automatic completion, Bookings, Invoices, Connections, access gate, and
  dashboard layout suites pass.
- Owner UI covers eligible selection, single/master links, one-time copy,
  refresh, enable/disable, rotate/revoke, aggregate request views, last viewed,
  zero-filled 30-day series, and unexpired contacts.
- Public UI covers single/master context, exactly two contact inputs,
  per-property gating, and token-scoped file actions at desktop and narrow
  widths.

## Required commands

Run the focused property-sharing suites, the existing dashboard/delivery
compatibility suites listed in issue #68, a focused production build, Biome on
changed JavaScript/JSX, and `git diff --check`. Record exact suite/test counts in
the pull request. Run repository-wide checks when practical and report their
known unrelated baseline separately.

## Sanitized browser proof

Use only synthetic properties, filenames, names, and phone values. Capture:

- desktop and narrow authenticated Properties pages with unchanged file
  controls, single/master management, metrics, state controls, and contacts;
- public single gate and authorized files;
- public master with at least two selected properties, separate gates, and an
  unselected property/file rejection;
- disabled and generic invalid states plus old-token rejection after rotation;
- network/log inspection confirming absence of stored URLs, bearer tokens,
  contact values, raw network addresses, user-agent, referrer, and fingerprint
  analytics.

Redact bearer tokens, cookies, phones, storage URLs, IDs, hosts, and environment
details before attaching proof. Exact environment-only evidence belongs under
ignored `docs/private/` material.
