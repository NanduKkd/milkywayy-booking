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
