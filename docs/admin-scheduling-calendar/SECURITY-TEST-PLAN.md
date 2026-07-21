# Admin scheduling calendar security test plan

- Last updated: 2026-07-21
- Release gate status: `IN_PROGRESS`

## Automated gates

- Anonymous and every non-Super-Admin role cannot read or mutate protected
  calendar data while the deferred access-control feature remains out of scope.
- Calendar reads expose only the customer/property/contact fields required by the UI.
- Event create/update/cancel rejects invalid dates, times, overlong text, past
  mutation, and unsupported statuses; events never alter availability.
- Admin booking preparation and customer handoff cannot bypass availability,
  pricing, OTP, or required customer/property validation.
- Handoff links are scoped, expiring, revocable, and cannot expose another
  customer's account or prepared properties.
- Handoff links expire after four hours; regeneration invalidates the previous
  link and does not create duplicate active reservations.
- The handoff service initializes model relations before any public handoff
  entrypoint runs. Public reads, OTP, checkout, and regeneration can eager-load
  the associated customer without route-order coupling.
- New-customer OTP sending and verification, handoff regeneration, and checkout
  retain the joined customer but lock only the root `Transaction` row. Focused
  service coverage must assert the generated Sequelize lock options so
  PostgreSQL is never asked to lock the nullable side of the outer join.
- Conflict tests cover simultaneous bookings and block versus booking creation.
- Working-day, full-day block, period block, capacity, override, and rolling-window precedence is deterministic.
- Dubai timezone boundary tests cover DST-independent midnight, month, and year transitions.
- Audit metadata records authorized overrides without logging unnecessary PII.

## Manual gates

- Verify calendar events never reserve or block customer availability.
- Verify an overlapping active booking prevents block creation, is identified
  with navigation to Bookings, and remains unchanged.
- Verify direct API mutation fails when the UI control is hidden by permission.
- Verify new-customer and registered-customer links enter the correct flow.
- After deployment, verify “Send verification code” proceeds without a
  PostgreSQL outer-join lock error, using only synthetic customer details in
  any captured proof.
- Verify edited properties are re-priced and revalidated before payment.
- Verify the WhatsApp checkbox sends only the correct customer-state template.
- Verify the WhatsApp checkbox defaults off and link copying does not send a message.
- Verify pending reservations block conflicts but appear as booked only after payment.

The tracked release evidence lives in `ROLLOUT-VERIFICATION.md`. Exact sampled
booking identifiers, operator-specific signoff, and deployment timing remain in
the ignored local worksheet `docs/private/ADMIN-SCHEDULING-CALENDAR-ROLLOUT.md`.

## Release blockers

- Customer and admin availability disagree for the same request context.
- A stale client can create an unacknowledged double booking.
- Calendar-only events affect customer availability or create booking records.
- A handoff can access or mutate a different customer's data.
- A joined handoff query emits an unscoped row lock, removes transaction
  serialization from OTP, regeneration, or checkout, or depends on unrelated
  route evaluation to initialize `Transaction.user`.
- Unauthorized users receive customer contact or property schedule details.
- A block can cancel, move, or override an active booking.
