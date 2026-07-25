# Booking delivery review architecture

Service-group identity is derived, not stored: `(booking_id, exact delivery
type)`. Existing `BookingDeliveryFile`, version, and revision rows remain the
audit source of truth, including compatibility-only `Videography` rows.

`deliveryServiceGroups` projects current customer-facing groups from persisted
file rows. Group commands are server actions that receive a booking and type,
never a client-selected file list. Mutations lock the booking before group
members (ascending file id), then update the full member set in one Sequelize
transaction. This keeps revision, replacement reopening, manual acceptance,
and worker acceptance at a single service boundary.

Customer surfaces render an admitted member directly only when its exact-type
service group contains one customer-visible file. Multi-file groups expose
their category summary and group-level revision and ZIP actions without member
rows; an owned member deep link targets the containing category. Booking
summaries state that files are ready for review in categories derived from the
same policy and exact persisted `type`, sorting and deduplicating only after
hidden, deleted, and replacement-pending members are excluded.

The admin category projection shares that exact-type identity and derived
status/revision/deadline logic, but deliberately projects all active nondeleted
members rather than applying customer visibility filtering. Admin category
deletion locks the booking first and category members in ascending id order,
loads version history in a separate query to avoid PostgreSQL outer-join lock
errors, deletes only those logical rows, and returns the historical URLs for
post-commit validated owned-object cleanup.

The ZIP download route uses the same derived group identity, but takes a
request-start read snapshot rather than holding a database transaction while
bytes are transferred. It loads every active row for the owner, booking, and
exact type and rejects the complete group if any member is private, awaiting
replacement, missing its pointed current version, or points to a superseded
version. S3 keys must contain the exact booking identifier under a current or
recognized legacy booking prefix. Object sizes are checked with S3 before
response headers are sent.

A Node streaming ZIP encoder is connected directly to the HTTP body. It opens
at most one S3 object body per archive, verifies actual bytes against the
preflight size, stores entries without recompression, forces ZIP64, and destroys
the archive plus active AWS request when the client disconnects. Copy-link
members are serialized into one bounded text manifest and are never fetched.
