# Customer web analytics architecture

- Last updated: 2026-07-01
- Status: `DRAFT`

## Design goals

- Connect paid acquisition to landing, login, booking, service, payment, revenue, and coarse location outcomes.
- Keep application behavior independent from analytics availability.
- Use verified payment state for purchase measurement.
- Keep direct customer and sensitive booking data out of analytics payloads.
- Preserve a path to reconcile business records without building a custom analytics platform.

## Proposed system boundaries

```text
Google Ads click
    |
    v
Landing and booking pages --> analytics wrapper --> GA4 --> reporting dashboard
    |                              |                |
    |                              |                +--> Google Ads audiences/reporting
    |                              +--> consent and identity controls
    v
Booking and transaction records
    |
    v
Verified Stripe webhook --> deduplicated purchase/conversion emission
    |
    +--> optional minimal booking attribution record (pending decision)
```

GA4 is the proposed behavioral analytics system. Google Ads remains the source
for ad delivery, click, cost, and bidding information. PostgreSQL and Stripe-backed
transaction state remain authoritative for bookings and payments.

The dashboard technology and whether minimal attribution is persisted are pending
decisions. BigQuery is not part of the first-release architecture.

## Proposed measurement model

### Landing journey

- `page_view`: standard GA4 page measurement.
- `booking_cta_clicked`: selected booking CTA interaction.
- Additional button events only when they answer an approved business question.

### Booking journey

- `booking_started`
- `service_selected`
- `booking_details_completed`
- `schedule_selected`
- `begin_checkout`
- `booking_validation_failed`
- `payment_failed`
- `purchase`

Final names and parameters are not accepted until CWA-003 completes. Event names
should remain stable after release; meaning changes require a documented version
or replacement event.

### Login journey

- Use GA4's recommended `login` event after successful authentication.
- Do not fire login on form submission or failed authentication.
- Apply the accepted User-ID only after authentication succeeds.

### Ecommerce purchase

The proposed `purchase` payload contains:

- stable, non-secret `transaction_id`
- `value`
- `currency`
- optional coupon identifier, subject to payload review
- `items`, with stable service ID, service name, category, price, and quantity

Purchase emission must be driven by authoritative payment confirmation, not merely
by viewing the success page. Duplicate webhook delivery or page refresh must not
create a second conversion for the same transaction.

## Attribution flow

1. Google Ads auto-tagging adds an available click identifier to the landing URL.
2. The application preserves approved UTM and Google click attribution values across the supported journey.
3. GA4 records user-, session-, and event-scoped acquisition dimensions.
4. On login, the accepted opaque User-ID behavior connects eligible authenticated activity.
5. On verified payment, the purchase is reported with transaction value and services.
6. If first-party persistence is accepted, the booking stores the approved attribution snapshot for reconciliation and conversion retry/audit behavior.

First-touch versus last-touch persistence, attribution expiry, cross-device behavior,
and identifier retention remain pending decisions.

## Proposed report model

### Acquisition and funnel

- Ads clicks/cost versus landing sessions.
- Landing sessions versus booking starts and purchases.
- Funnel drop-off by campaign, source/medium, device, and coarse location.

### Login

- Paid landing sessions that complete login.
- Login-completed users or sessions that later start or complete a booking.
- Login-completed users or sessions with no booking in the approved look-forward window.

The reporting identity, funnel scope, and look-forward window must be explicitly
defined before these numbers can be considered stable.

### Campaign and services

- Bookings and revenue by campaign.
- Booked service quantity and revenue by campaign.
- Average booking value, cost per booking, and return on ad spend where linked cost data is available.

### Location

- GA4 country, region, and city are approximate acquisition/activity locations.
- A normalized `booking_region` may represent the booked property's coarse business location if approved.
- Exact address, coordinates, and free-text property location must not be sent.
- Reports must label whether location means visitor-derived location or booking region.

## Analytics wrapper

Application code should call one internal interface rather than vendor globals.
The wrapper should provide:

- page measurement
- allowlisted custom events
- ecommerce events
- identity set/reset
- consent updates
- safe no-op behavior when disabled, blocked, or unavailable
- development/test inspection hooks

The wrapper must validate or construct approved payloads so feature components do
not send arbitrary user-entered data.

## Proposed first-party persistence

If accepted, use a separate one-to-one booking attribution table instead of raw
event storage. Candidate fields are:

- booking or transaction foreign key
- first-touch source, medium, campaign, and landing path
- last-touch source, medium, campaign, and landing path
- one of the supported Google click identifiers
- attribution captured/expired timestamps
- consent state/version where operationally required
- conversion send status, attempt timestamp, and non-sensitive error category if server-side retry is approved

Exact columns, retention, encryption needs, and whether conversion delivery is
browser-side or server-assisted remain pending decisions. No raw analytics event
log belongs in the application database.

## Failure behavior

- Analytics failure must never prevent landing, login, booking, or payment completion.
- Missing consent or blocked scripts should produce no prohibited fallback collection.
- Duplicate verified-payment notifications must remain idempotent.
- Reporting should distinguish unattributed traffic rather than guessing a campaign.
- Dashboard outages must not affect customer-facing application behavior.

## Future evolution

GA4 BigQuery export may be evaluated later if the team needs raw event retention,
complex joins, unsampled analysis, or reporting beyond GA4/dashboard limits. It is
not a dependency or task for the first release.

