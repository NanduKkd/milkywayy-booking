# Booking delivery group security and quality checks

- Verify a revision action is owner-, booking-, exact-type-, current-version-,
  and review-window-scoped; unavailable, stale, or cross-owner groups return a
  uniform unavailable response.
- Verify notes are required and bounded, and group membership is resolved only
  from server-side rows.
- Exercise concurrent upload, revision, replacement, manual acceptance, and
  deadline acceptance attempts. Each transaction must lock the booking before
  deterministic member locks and leave no split status/deadline/revision state.
- Verify legacy `Videography` remains a separate readable and replaceable group
  without any data migration.
- Verify ZIP requests are owner-, booking-, exact-type-, visibility-, current-
  version-, and member-count-scoped with a uniform unavailable response.
- Verify unsafe member/header names are sanitized and made unique; `copy_link`
  records appear only in `EXTERNAL_LINKS.txt` and never trigger an upstream
  HTTP request.
- Exercise five slow ZIP pipelines plus a sixth rejected request, one S3 body
  per archive, cancellation, upstream failure, declared/actual byte limits,
  ZIP64/store settings, and private/no-store/no-proxy-buffer response headers.
- Verify a hidden, private, changes-requested, missing-current, superseded, or
  cross-booking-key member rejects the complete exact-type group rather than
  producing a partial archive.
- Run the bounded memory harness normally and with five logical 2 GiB archives;
  require at most 320 MiB aggregate incremental RSS, no size-proportional
  growth, five total active bodies, and no body/permit retained after completion
  or cancellation.
