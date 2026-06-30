# Admin scheduling calendar security test plan

- Last updated: 2026-06-30
- Release gate status: `NOT_STARTED`

## Automated gates

- Anonymous, Customer, Accounts-without-calendar, and disabled staff cannot read
  or mutate protected calendar data.
- Calendar reads expose only the customer/property/contact fields required by the UI.
- Event create/update/cancel rejects invalid dates, periods, times, capacity,
  overlong text, and unsupported statuses.
- Full admin-booking creation cannot bypass pricing or required customer/property validation.
- Conflict tests cover two simultaneous bookings, booking versus event, event
  versus event, and block versus create.
- Working-day, full-day block, period block, capacity, override, and rolling-window precedence is deterministic.
- Dubai timezone boundary tests cover DST-independent midnight, month, and year transitions.
- Audit metadata records authorized overrides without logging unnecessary PII.

## Manual gates

- Verify a calendar-only note does not reserve capacity and a reserving event does.
- Verify block confirmation lists existing bookings/events and leaves them unchanged.
- Verify an explicit admin override is clearly labelled and actor-attributed.
- Verify direct API mutation fails when the UI control is hidden by permission.
- Verify cancelled events release capacity exactly once.

## Release blockers

- Customer and admin availability disagree for the same request context.
- A stale client can create an unacknowledged double booking.
- Calendar-only events unexpectedly create invoices, transactions, or customer records.
- Unauthorized users receive customer contact or property schedule details.
