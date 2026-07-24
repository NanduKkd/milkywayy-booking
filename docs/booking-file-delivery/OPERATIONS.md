# Booking delivery review operations

The automatic completion worker accepts an expired service group only after it
locks the booking and confirms every current member is still under review with
an expired deadline. It then accepts every member in the same transaction.

If an operator sees a group awaiting replacement, replacements must be
submitted against the existing logical files. Do not alter persisted type,
revision, or status rows manually; doing so can violate the review boundary.
