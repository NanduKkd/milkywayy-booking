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
- Preparation and handoff registration accept persisted `null` values at
  optional customer-string boundaries, including non-applicable Individual
  company fields and optional Company contact name/TRN, while preserving Company
  name, billing address, and email requirements. Validation responses expose one
  safe actionable message rather than a serialized schema issue array; server
  logs retain the complete diagnostic error.
- While an OTP verification ID is active, the customer/account inputs remain
  disabled and the code destination stays visible. Change details clears the
  client attempt and unlocks the fields; resend starts behind a 30-second
  client-side cooldown without disabling OTP entry.
- The canonical booking form has explicit normal and handoff adapters. Focused
  mocks assert that handoff mode does not call normal draft load/autosave or
  normal booking/transaction actions, preserves all prepared property/contact
  initial values, and submits only through the token-scoped checkout endpoint.
- Registration-required handoffs cannot render the shared property form before
  OTP verification. Invalid, expired, superseded, and already-paid responses
  keep the form inaccessible.
- Token-scoped promotion preview rate-limits both the opaque token and request
  source, ignores browser-supplied identity, and resolves the transaction
  customer only after current-version, expiry, payment, OTP, ownership, and
  customer-role checks. The same automatic, personal, generic-code, payable,
  and separate wallet-credit states render through the shared order summary.
- Final handoff checkout repeats token and ownership checks after locking the
  existing transaction. Synthetic coverage changes availability, token version,
  promotion eligibility, and promotion reservation outcome after preview;
  checkout must fail before Stripe when any current fact is invalid.
- Edited, added, duplicated, and removed properties replace the existing
  transaction's booking set inside the checkout transaction. No normal draft or
  second transaction is created, and stale booking rows are removed.
- Checkout retry replaces prior pending wallet and promotion artifacts. A
  Stripe or database failure rolls back the synchronized booking/payment state
  and expires a newly orphaned Stripe session.
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

The focused regression command for the nullable-customer boundary and safe
preparation/handoff route errors is:

```bash
npx jest --runInBand src/lib/services/__tests__/adminBookingPreparation.test.js src/app/api/admin/scheduling-calendar/booking-handoffs/__tests__/route.test.js src/app/api/admin/scheduling-calendar/booking-preparation/__tests__/route.test.js
```

The focused shared-form and handoff-state command is:

```bash
npx jest --runInBand src/app/booking/__tests__/BookNew.test.jsx src/app/booking/__tests__/bookingFormAdapters.test.js src/app/booking/components/__tests__/PropertyCard.test.jsx 'src/app/booking/handoff/[token]/__tests__/BookingHandoffPageClient.test.jsx' 'src/app/api/booking-handoffs/[token]/__tests__/route.test.js' 'src/app/api/booking-handoffs/[token]/checkout/__tests__/route.test.js'
```

The focused token-scoped pricing and atomic checkout command is:

```bash
npx jest --runInBand --runTestsByPath src/lib/services/__tests__/adminBookingHandoffs.test.js src/lib/services/__tests__/promotionPricing.test.js src/lib/services/__tests__/promotionCheckout.test.js src/app/booking/__tests__/BookNew.test.jsx 'src/app/booking/handoff/[token]/__tests__/BookingHandoffPageClient.test.jsx' 'src/app/api/booking-handoffs/[token]/promotion-preview/__tests__/route.test.js' 'src/app/api/booking-handoffs/[token]/checkout/__tests__/route.test.js'
```

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
- A preview reveals promotion eligibility before token/current-version/OTP
  validation, trusts a browser customer ID, or final checkout accepts a stale
  preview, leaves duplicate bookings/transactions, or charges a mismatched amount.
- Unauthorized users receive customer contact or property schedule details.
- A block can cancel, move, or override an active booking.
