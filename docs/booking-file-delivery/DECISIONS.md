# Booking delivery review decisions

- Group review uses the exact persisted delivery type within one booking. No
  type backfill or speculative migration is performed.
- Revision count and note are synchronized to every current group member while
  file-level revision records preserve version-specific audit history.
- A replacement does not reveal a partially repaired group. Only the final
  requested replacement reopens the full group with a new Dubai deadline.
- Adding a file to an accepted or reviewable service reopens all of its current
  members so the customer decides on the complete service set.

## Streaming multi-file downloads

Authenticated multi-file delivery uses an on-demand archive rather than a
persisted or cached ZIP, so no schema migration or archive lifecycle is needed.
The server authorizes a request-start owner/booking/exact-type snapshot, rejects
any incoherent active group, and preflights booking-owned S3 objects before
returning headers.

Archive entries use Archiver's streaming ZIP implementation with store mode and
forced ZIP64. Store mode avoids recompressing photos, video, and existing
archives; ZIP64 supports valid groups beyond classic ZIP limits. Version 7 is
pinned because it is the maintained package's CommonJS-compatible release for
this repository's current Jest/Next toolchain; dependency audit results are
recorded with the pull request.

Admission is intentionally capped at five pipelines in the current single PM2
process. This is not a distributed concurrency guarantee: adding web processes
requires replacing the in-process counter with a shared lease or semaphore.
External links remain text manifest entries and are never fetched by the
archive service.
