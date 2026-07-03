# Admin scheduling calendar security test plan

- Last updated: 2026-07-03
- Release gate status: `IN_PROGRESS`

## Automated gates

- Anonymous, Customer, Accounts-without-calendar, and disabled staff cannot read
  or mutate protected calendar data.
- Calendar reads expose only the customer/property/contact fields required by the UI.
- Event create/update/cancel rejects invalid dates, times, overlong text, past
  mutation, and unsupported statuses; events never alter availability.
- Admin booking preparation and customer handoff cannot bypass availability,
  pricing, OTP, or required customer/property validation.
- Handoff links are scoped, expiring, revocable, and cannot expose another
  customer's account or prepared properties.
- Handoff links expire after four hours; regeneration invalidates the previous
  link and does not create duplicate active reservations.
- Conflict tests cover simultaneous bookings and block versus booking creation.
- Working-day, full-day block, period block, capacity, override, and rolling-window precedence is deterministic.
- Dubai timezone boundary tests cover DST-independent midnight, month, and year transitions.
- Audit metadata records authorized overrides without logging unnecessary PII.

## Manual gates

- Verify calendar events never reserve or block customer availability.
- Verify an overlapping active booking prevents block creation, is identified
  with navigation to Bookings, and remains unchanged.
- Verify an explicit admin override is clearly labelled and actor-attributed.
- Verify direct API mutation fails when the UI control is hidden by permission.
- Verify new-customer and registered-customer links enter the correct flow.
- Verify edited properties are re-priced and revalidated before payment.
- Verify the WhatsApp checkbox sends only the correct customer-state template.
- Verify the WhatsApp checkbox defaults off and link copying does not send a message.
- Verify pending reservations block conflicts but appear as booked only after payment.

## Release blockers

- Customer and admin availability disagree for the same request context.
- A stale client can create an unacknowledged double booking.
- Calendar-only events affect customer availability or create booking records.
- A handoff can access or mutate a different customer's data.
- Unauthorized users receive customer contact or property schedule details.
- A block can cancel, move, or override an active booking.
