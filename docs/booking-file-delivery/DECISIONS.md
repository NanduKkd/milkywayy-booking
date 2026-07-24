# Booking delivery review decisions

- Group review uses the exact persisted delivery type within one booking. No
  type backfill or speculative migration is performed.
- Revision count and note are synchronized to every current group member while
  file-level revision records preserve version-specific audit history.
- A replacement does not reveal a partially repaired group. Only the final
  requested replacement reopens the full group with a new Dubai deadline.
- Adding a file to an accepted or reviewable service reopens all of its current
  members so the customer decides on the complete service set.
