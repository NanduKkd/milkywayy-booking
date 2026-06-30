# Customer web analytics security and test plan

- Last updated: 2026-07-01
- Status: `DRAFT`

## Release gates

The feature must not be released until:

- the consent and regional collection policy is approved
- the event dictionary and parameter allowlist are approved
- no prohibited direct or sensitive data appears in analytics requests
- payment conversions are authoritative and idempotent
- analytics failures do not block customer workflows
- account access follows least privilege
- required automated and manual checks pass with recorded evidence

## Data classification and prohibitions

Do not send the following to GA4, Google Ads, dashboard dimensions, URLs, event
names, logs, or optional attribution storage unless a later explicit decision and
policy permits a narrowly defined transformation:

- customer name, email address, or phone number
- exact property/contact address or coordinates
- OTPs, session tokens, authorization data, or cookies
- card, Stripe secret, payment-method, or bank information
- signed file URLs, filenames, or delivery paths
- free-text form values, validation messages containing user input, or stack traces
- raw database IDs where an approved opaque analytics identifier should be used

Enhanced conversions are blocked until CWA-D008 and CWA-D011 are accepted and the
required customer-data policy review is complete.

## Automated tests

### Event contract

- Approved user actions emit the expected event once.
- Unapproved actions emit no custom event.
- Payload construction drops unknown fields.
- Parameters have expected type, range, and stable identifiers.
- User-entered values cannot flow into event names or unrestricted parameters.

### Consent

- No disallowed storage or event transmission occurs before the accepted consent state.
- Grant, deny, withdraw, and reload paths update collection behavior correctly.
- Missing or malformed consent state fails according to the approved safe default.

### Identity

- Anonymous use does not send authenticated User-ID.
- Successful login applies only the approved opaque identifier.
- Failed login does not apply identity or emit `login`.
- Logout/reset clears identity according to the accepted rule.
- Email, phone, name, and booking/customer input are rejected from analytics payloads.

### Attribution

- Approved UTM and click identifiers survive supported landing, redirect, and booking navigation.
- Expired attribution is not reused beyond the accepted window.
- Direct or unattributed traffic remains explicitly unattributed.
- Query parameters not on the allowlist are not persisted.

### Purchase and payment

- Only authoritative successful payment emits `purchase`.
- Pending, failed, cancelled, and unverified payment does not emit `purchase`.
- Duplicate Stripe webhook delivery and success-page refresh do not duplicate the transaction conversion.
- Value, currency, coupon, and service items match the authoritative transaction/booking.
- Analytics provider timeout or rejection does not fail or delay payment confirmation.

### Optional persistence

- Migration applies and rolls back safely in a representative environment.
- One booking/transaction cannot accumulate unintended duplicate attribution rows.
- Indexed lookup and update paths are bounded.
- Retention/deletion behavior matches the accepted policy.
- Sensitive identifiers are absent from logs and error responses.

## Manual validation

### Browser and tag validation

- Validate supported desktop and mobile browsers.
- Use GA4 DebugView and approved Google diagnostics to inspect event order and payloads.
- Test internal navigation, redirects, refresh, back/forward, multiple tabs, and interrupted checkout.
- Confirm arbitrary Google auto-tagging query parameters do not break landing pages.
- Inspect network requests for prohibited data.

### Funnel scenarios

- Ad landing with no interaction.
- Ad landing followed by CTA and booking start.
- Service selection followed by abandonment at each approved stage.
- Landing followed by successful login but no booking within the accepted window.
- Landing followed by login, booking, and successful payment.
- Multiple services and coupon usage.
- Failed payment followed by successful retry.
- Returning authenticated customer on the same and a different device, with documented limitations.

### Reporting scenarios

- Campaign-to-booking count.
- Services and revenue by campaign.
- Paid landing sessions without booking.
- Paid landing sessions with login, with and without later booking.
- Visitor geography versus normalized booking region, if approved.
- Ad cost, conversion value, CPA, and ROAS where linked data is available.
- Unattributed, consent-denied, low-volume, and empty-state behavior.

## Security and privacy cases

- Attempt to inject customer data through UTM parameters and event-triggering fields.
- Attempt oversized, malformed, and unexpected attribution parameters.
- Verify analytics endpoints and configuration expose no server secrets.
- Verify Content Security Policy changes are minimal and documented if required.
- Verify dashboard viewers cannot gain unintended access to Google accounts or raw customer records.
- Verify logs redact or omit click identifiers and customer data according to the accepted policy.

## Performance and resilience

- Measure client bundle and request impact against an agreed baseline.
- Confirm analytics loads asynchronously and does not block rendering or interaction.
- Test blocked scripts, provider outage, network timeout, and ad blocker behavior.
- Confirm repeated analytics failures do not produce unbounded retries or database growth.
- Confirm optional attribution writes add no material booking/payment latency.

## Required evidence

- Automated test command and result.
- Build/lint results, including clearly identified pre-existing failures.
- DebugView/tag diagnostic screenshots or review notes without sensitive identifiers.
- Sample transaction reconciliation with redacted identifiers.
- Consent and prohibited-data review approval.
- Dashboard acceptance review.
- Rollback validation note.

Evidence belongs in [TASKS.md](./TASKS.md) as tasks progress. Exact production
identifiers and sensitive operational evidence belong only in the approved private
operations document.

## Known limitations to validate and communicate

- Consent denial, blockers, browser restrictions, and network loss reduce measured traffic.
- Google Ads clicks and GA4 sessions are not equivalent counts.
- GA4 visitor geography is approximate.
- Low-volume or sensitive report combinations may be thresholded.
- Cross-device and pre-login association is incomplete without eligible identity signals.
- Analytics attribution and accounting totals will not always match.
- BigQuery export is intentionally outside this release.

