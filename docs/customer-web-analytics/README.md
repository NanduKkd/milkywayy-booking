# Customer web analytics delivery plan

- Last updated: 2026-07-01
- Planning status: `IN_PROGRESS`
- Implementation status: `NOT_STARTED`
- Target: measure the customer acquisition, booking, payment, login, service, campaign, revenue, and location funnels using Google Analytics 4 and Google Ads, with business reporting in a dashboard.

## Purpose

Provide decision-useful analytics for the public landing page, customer booking
flow, payment completion, and customer login journey. The feature must connect
Google Ads acquisition to bookings, booked services, revenue, abandonment, and
coarse location without making analytics the financial source of truth.

This is a draft delivery contract. Items in
[DECISIONS.md](./DECISIONS.md) marked `PROPOSED` remain pending and must be
accepted before dependent implementation begins.

## Document index

- [TASKS.md](./TASKS.md): authoritative implementation tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): target event, attribution, reporting, and persistence design.
- [DECISIONS.md](./DECISIONS.md): proposed decisions, accepted scope constraints, and open questions.
- [OPERATIONS.md](./OPERATIONS.md): configuration, rollout, monitoring, and rollback.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): privacy, payment, attribution, and release verification.

## Status model

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | Work cannot proceed until a dependency or decision is resolved. |
| `IN_REVIEW` | Implementation is complete and awaiting review or verification. |
| `DONE` | Acceptance criteria are satisfied and evidence is recorded. |
| `DEFERRED` | Explicitly removed from the current release. |

## Initial scope

- Landing-page views and explicitly selected CTA/button interactions.
- Detailed booking-funnel events covering start, service selection, booking details, scheduling, checkout, failures, and abandonment analysis.
- Verified booking/payment completion with transaction ID, currency, revenue, coupon, and booked services.
- Google Ads auto-tagging, campaign attribution, and conversion measurement.
- Login-completed measurement and funnels that distinguish login with and without a later booking.
- Campaign reports for bookings, services, revenue, landing-only visits, login completion, and login without booking.
- Coarse country, region, and city reporting from GA4, plus a normalized booking-region field if approved.
- A reporting dashboard covering acquisition, funnel, campaign, service, revenue, and location views.
- Consent-aware collection, data minimization, analytics identity handling, testing, rollout, and monitoring.
- Optional minimal first-party attribution persistence if approved in `DECISIONS.md`.

## Explicit non-goals

- Building a custom analytics event warehouse, ingestion pipeline, or dashboard application.
- Treating GA4 or Google Ads as the authoritative payment or accounting ledger.
- Sending customer names, email addresses, phone numbers, exact addresses, OTPs, payment details, filenames, or signed URLs as analytics dimensions or event parameters.
- Session replay, heatmaps, feature flags, experimentation, or PostHog in the first release.
- Exact GPS or property-address reporting.
- Retrospective attribution for traffic collected before instrumentation.
- BigQuery export or BigQuery-backed reporting in the first release. It is recorded only as a future suggestion.

## Dependencies

- Access to the production GA4 property, Google Ads account, tag/configuration tooling, and selected dashboard workspace.
- Approved consent and privacy requirements for the regions in which the site operates.
- Stable service identifiers and normalized service names for ecommerce `items`.
- Existing booking, transaction, user-session, and Stripe webhook flows.
- Resolution of the proposed decisions that gate implementation.

## Delivery estimate

Estimates begin after the required decisions and account access are available.

| Milestone | Estimate |
|---|---:|
| M0 - Measurement contract and decisions | 1-2 engineering days |
| M1 - Analytics and attribution foundation | 2-3 engineering days |
| M2 - Funnel, payment, Ads, and reporting implementation | 3-5 engineering days |
| M3 - Verification and rollout | 1-2 engineering days |
| **Total** | **7-12 engineering days** |

The estimate excludes delays for account provisioning, legal/privacy review,
campaign traffic accumulation, and Google reporting latency.

## Completion definition

- The approved event dictionary defines every event, trigger, parameter, identity rule, and prohibited field.
- Landing, booking, login, payment, campaign, service, revenue, and location reports pass the agreed acceptance scenarios.
- A purchase/conversion is emitted only after authoritative server-side payment verification and is deduplicated by a stable transaction identifier.
- Google Ads auto-tagging and attribution parameters survive supported landing and booking paths.
- Dashboard totals reconcile to GA4 for the same dimensions and reporting period.
- Sampled paid bookings reconcile to authoritative transaction records within the documented limitations of consent, blockers, and attribution.
- Privacy, consent, security, automated test, manual validation, rollout, monitoring, and rollback gates are complete.
- Every release-blocking task in [TASKS.md](./TASKS.md) is `DONE` with evidence.

## Status update rules

1. `TASKS.md` is the authoritative implementation tracker.
2. Update task status and evidence in the same change as implementation.
3. Do not start a decision-dependent task until its decision is `ACCEPTED`.
4. Add newly discovered work under a new stable task ID.
5. Update the `Last updated` date when scope, decisions, or status materially changes.

