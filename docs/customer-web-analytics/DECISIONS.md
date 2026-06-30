# Customer web analytics decisions

- Last updated: 2026-07-01

## Status legend

| Status | Meaning |
|---|---|
| `PROPOSED` | Recommended but awaiting approval or validation. |
| `ACCEPTED` | Governs implementation. |
| `REJECTED` | Considered and explicitly not chosen. |
| `SUPERSEDED` | Replaced by a later decision. |

## Decision register

### CWA-D001 - Use GA4 and Google Ads for first-release analytics

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Product / Marketing / Engineering
- Context: The requested acquisition, funnel, ecommerce, campaign, service, login, revenue, and approximate location reports fit the Google measurement stack.
- Decision: Use GA4 for behavioral/ecommerce events and Google Ads for campaign delivery and conversion optimization; do not add PostHog in the first release.
- Consequence: Engineering implements a vendor-isolated wrapper, while reporting remains subject to Google consent, attribution, threshold, and blocking behavior.

### CWA-D002 - Use an external reporting dashboard rather than building one in the application

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Product / Marketing
- Context: Stakeholders need recurring multi-view reporting beyond ad-hoc GA4 explorations.
- Decision: Use Looker Studio as the initial dashboard over supported GA4 and Google Ads data.
- Consequence: Dashboard ownership, access, refresh behavior, and connector limitations must be documented; no custom dashboard UI is included.

### CWA-D003 - Measure purchases from authoritative payment confirmation

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Engineering / Finance / Marketing
- Context: Success-page views can be repeated, blocked, or reached independently of a newly verified payment.
- Decision: Create the purchase/conversion only from an authoritative successful transaction, using a stable transaction ID for deduplication.
- Consequence: The Stripe webhook/transaction flow must support safe analytics delivery or an idempotent handoff without delaying payment processing.

### CWA-D004 - Define financial reporting authority

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Finance / Product / Marketing
- Context: GA4 and Google Ads can lose or reattribute events because of consent, blockers, identity, and attribution rules.
- Decision: PostgreSQL transaction records remain the financial source of truth; analytics revenue is a campaign-performance measure and must be periodically reconciled.
- Consequence: Dashboards must state this limitation and must not be used as the accounting ledger.

### CWA-D005 - Persist minimal first-party booking attribution

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Product / Engineering / Privacy
- Context: Campaign and click attribution may be needed for reconciliation, durable conversion delivery, and business-record reporting.
- Decision: Store one minimal attribution snapshot per booking or transaction, not raw behavioral events.
- Consequence: A migration, model, retention rule, access boundary, and deletion behavior are required. Rejecting this decision defers CWA-105 and reduces reconciliation capability.

### CWA-D006 - Attribution model and expiry

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Marketing / Product
- Context: First-touch, last-touch, GA4 attributed credit, and Google Ads attributed credit answer different questions.
- Decision: Define which attribution view governs each dashboard metric, whether both first and last touch are retained, and how long captured attribution remains eligible for a later booking.
- Consequence: Funnel definitions and campaign totals cannot be finalized until this is accepted.

### CWA-D007 - Authenticated analytics identity

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Product / Engineering / Privacy
- Context: Login-to-booking analysis across sessions benefits from GA4 User-ID, but identity handling changes privacy and logout behavior.
- Decision: Decide whether to send an opaque internal User-ID after successful login and define logout/reset and cross-device expectations.
- Consequence: No email, phone, name, booking code, or other direct identifier may be used as the analytics User-ID.

### CWA-D008 - Consent and regional collection policy

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Privacy / Product / Marketing
- Context: Analytics storage, advertising measurement, and enhanced conversions depend on the applicable consent policy and operating regions.
- Decision: Approve consent categories, default states, banner behavior, Consent Mode behavior, retention, and whether enhanced conversions are permitted.
- Consequence: Analytics initialization and conversion coverage depend on this decision; engineering must not infer legal policy.

### CWA-D009 - Location definitions

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Product / Marketing / Privacy
- Context: GA4 city/region is approximate visitor location, while the business may need the booked property's service region.
- Decision: Decide whether reports require only GA4-derived geography or also an allowlisted, coarse `booking_region` derived from booking data.
- Consequence: Exact addresses and free-text location remain prohibited. Dashboard labels must distinguish visitor location from booking region.

### CWA-D010 - Reporting timezone and conversion window

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Product / Marketing / Finance
- Context: Daily revenue, campaign comparison, and “login but not booked” require stable time boundaries and a defined look-forward period.
- Decision: Approve the reporting timezone and the elapsed window after login/landing used to classify no-booking cohorts.
- Consequence: Dashboard totals and validation fixtures use the accepted definitions.

### CWA-D011 - Google Ads conversion source and enhanced conversions

- Status: `PROPOSED`
- Date: 2026-07-01
- Owners: Marketing / Engineering / Privacy
- Context: Importing a GA4 key event and configuring a direct Google Ads conversion have different implementation and enhanced-conversion capabilities.
- Decision: Choose the primary Google Ads purchase conversion source, secondary observation conversions, and whether enhanced conversions are enabled.
- Consequence: Avoid counting multiple purchase actions as primary bidding conversions; customer-data handling requires explicit approval.

### CWA-D012 - Defer BigQuery export

- Status: `ACCEPTED`
- Date: 2026-07-01
- Owners: Product
- Context: BigQuery adds useful raw-data and joining capabilities but is not required for the initial requested dashboard.
- Decision: BigQuery export is not part of the first release or task tracker. Retain it only as a future suggestion.
- Consequence: The first release uses GA4/Google Ads reporting and the selected dashboard within their retention, threshold, sampling, and connector constraints.

## Open questions

- Which landing-page buttons are decision-useful enough to track?
- Which booking interactions and failure reasons are required, and at what level of detail?
- Is a booking counted at payment success, booking confirmation, or another business state?
- Should refunded revenue be adjusted in campaign reporting, and on which date basis?
- Which Google Ads accounts, campaigns, and conversion actions are in scope?
- Who owns the event dictionary, dashboard definitions, and ongoing discrepancy review?
- What consent and privacy requirements apply to the actual production audience?
- What reporting timezone and no-booking look-forward window should be used?
- Is coarse property/service region required in addition to GA4 visitor geography?

## Explicit non-decisions

- Draft event names in `ARCHITECTURE.md` are proposals, not an accepted event contract.
- The draft does not approve collection of customer-provided data for enhanced conversions.
- The draft does not approve persistence of Google click identifiers until CWA-D005 and CWA-D008 are accepted.

