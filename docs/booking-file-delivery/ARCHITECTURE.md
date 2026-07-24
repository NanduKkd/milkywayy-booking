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
