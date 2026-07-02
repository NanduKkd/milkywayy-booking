# Admin scheduling calendar decisions

- Last updated: 2026-07-02

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| CAL-D001 | Support both calendar-only events and complete admin-created bookings. | Operational holds/notes do not always need customer, payment, invoice, or delivery records; real bookings do. |
| CAL-D002 | Time Slots remains the scheduling configuration authority. | Working days are only one overlap; blocks, periods, capacity, weights, rolling windows, and existing bookings must also agree. |
| CAL-D003 | Calendar-only events explicitly declare whether they consume capacity. | Informational notes must not block customers, while holds and manual shoots usually should. |
| CAL-D004 | Full-day and period blocks reuse existing date overrides. | A second block store would create inconsistent customer and admin availability. |
| CAL-D005 | Existing bookings survive later blocks. | Blocking future availability must not silently mutate paid or operational records. |
| CAL-D006 | Admin booking creation uses shared pricing and availability services. | Duplicate calculation logic would drift from customer checkout. |
| CAL-D007 | Dubai business time controls scheduling boundaries. | The service operates on Dubai property schedules, independent of server/operator timezone. |
| CAL-D008 | Server-side conflict checks are mandatory at mutation time. | Calendar views become stale and cannot safely guarantee capacity on their own. |
| CAL-D009 | Administrators can block an exact `from`/`to` time range in 30-minute increments. Any customer booking whose scheduled interval overlaps the block is unavailable. | Operators need blocks such as 10:00-10:30 and 10:00-12:30 without blocking an unrelated part of the day or entering capacity units. |
| CAL-D010 | A block cannot be saved while it overlaps an active booking. The Calendar identifies the conflicting booking and directs the administrator to manage it in Bookings before retrying the block. | Blocks must never cancel, move, or silently override an existing booking. Booking cancellation and rescheduling remain explicit actions in the Bookings workflow. |
| CAL-D011 | Retain calendar-only events as non-blocking informational entries. They require a title, date, and either full-day or 30-minute-aligned start/end selection; description is optional, and past events are read-only. This supersedes the capacity-reserving behavior in CAL-D003. | Informational events are already implemented and remain useful, while customer availability changes belong exclusively to the Block action. |
| CAL-D012 | An admin can prepare multiple property bookings for either an existing customer or a not-yet-registered customer. | Operational requests can contain multiple properties and should use one handoff. |
| CAL-D013 | A not-yet-registered customer receives a secure link with admin-entered name, optional company name, email, phone number, and property details prefilled and editable. The customer completes registration, verifies their phone by OTP, reviews the properties, and proceeds to payment. | The customer must verify and own the final account and booking details; the admin-entered phone supports both handoff delivery and OTP verification. |
| CAL-D014 | A registered customer follows the secure link directly to editable property review and payment without repeating registration. | Existing customers should not repeat onboarding. |
| CAL-D015 | Admin-prepared bookings obey normal customer blocks, availability, and calculated pricing without force or price override. The customer's eligible coupons, promotions, discounts, and wallet benefits remain available through the existing checkout flow. | Admin preparation must not create a second pricing or availability path. |
| CAL-D016 | Admin-prepared bookings are implicitly payment-pending and reserve their requested availability for four hours, matching the current pending-booking flow. They appear as pending holds rather than booked until payment succeeds. Payment status is not admin-selectable, and invoice creation remains tied to successful payment. | The slot must be protected during checkout without presenting an unpaid booking as confirmed. |
| CAL-D017 | The admin chooses whether to send the handoff through WhatsApp using a checkbox that defaults to unselected. Registration-required and already-registered customers receive different notification templates. The secure payment link can be copied at any time. | Each customer state requires a different next-action message, sending remains operator-controlled, and admins need a channel-independent way to share the link. |
| CAL-D018 | Completed bookings appear in the customer dashboard. | Admin-prepared bookings become normal customer bookings after completion. |
| CAL-D019 | Calendar access remains Super Admin-only until the deferred access-control feature resumes. | This preserves the current authorization boundary without adding temporary permissions. |
| CAL-D020 | Calendar events, exact blocking, admin booking preparation, customer handoff, and payment integration release together rather than through separate product stages. | Product requires the complete workflow at launch. |
| CAL-D021 | A payment link expires after four hours. An admin can generate a replacement link, which starts a new four-hour window using the current booking details and invalidates the superseded link. | Operators need recovery when customers miss the original payment window without allowing multiple active checkout links for the same pending booking. |

## Deferred decisions

- Recurring events.
- Drag-and-drop rescheduling.
- External calendar synchronization.
- Automated staff/resource assignment.
