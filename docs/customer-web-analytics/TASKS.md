# Customer web analytics task tracker

- Last updated: 2026-07-01
- Overall implementation status: `NOT_STARTED`
- Current milestone: `M0 - Measurement contract and decisions`

This is the authoritative progress tracker. Status values and update rules are
defined in [README.md](./README.md).

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Measurement contract and decisions | `NOT_STARTED` | 0 | 4 | 1-2 days |
| M1 - Analytics and attribution foundation | `NOT_STARTED` | 0 | 5 | 2-3 days |
| M2 - Funnel, conversions, and dashboard | `NOT_STARTED` | 0 | 7 | 3-5 days |
| M3 - Verification and rollout | `NOT_STARTED` | 0 | 5 | 1-2 days |

## M0 - Measurement contract and decisions

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-001 | Approve first-release measurement scope and success criteria | `NOT_STARTED` | Product / Marketing / Engineering | None | Required reports, conversion definitions, reporting timezone, and success criteria are accepted in `DECISIONS.md` | Pending |
| CWA-002 | Approve analytics, Ads, dashboard, identity, consent, and attribution choices | `NOT_STARTED` | Product / Marketing / Engineering / Privacy | CWA-001 | Every release-gating `PROPOSED` decision is accepted, rejected, or superseded | Pending |
| CWA-003 | Define the event and parameter dictionary | `NOT_STARTED` | Engineering / Marketing | CWA-001, CWA-002 | Each event has a trigger, scope, parameters, deduplication rule, owner, and prohibited-data review | Pending |
| CWA-004 | Obtain and validate external account access | `NOT_STARTED` | Marketing / Operations | CWA-002 | Required GA4, Google Ads, tag, consent, and dashboard access is confirmed without recording sensitive identifiers in tracked docs | Pending |

## M1 - Analytics and attribution foundation

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-101 | Implement a vendor-isolated analytics wrapper | `NOT_STARTED` | Engineering | CWA-003 | Page, event, identity, consent, and ecommerce calls use one tested interface and fail without breaking product flows | Pending |
| CWA-102 | Implement consent-aware initialization and state changes | `NOT_STARTED` | Engineering / Privacy | CWA-002, CWA-101 | Collection behavior matches the accepted consent policy before and after consent updates | Pending |
| CWA-103 | Capture campaign and click attribution | `NOT_STARTED` | Engineering | CWA-002, CWA-101 | Approved UTM and Google click identifiers survive supported navigation and are associated with the booking according to the accepted attribution rule | Pending |
| CWA-104 | Implement approved analytics identity behavior | `NOT_STARTED` | Engineering | CWA-002, CWA-101 | Anonymous and authenticated activity follow the approved User-ID and logout/reset rules without sending direct identifiers | Pending |
| CWA-105 | Add minimal attribution persistence | `NOT_STARTED` | Engineering | CWA-002, CWA-103 | If approved, migration/model store only the accepted first-party attribution fields with indexes, retention behavior, and tests; otherwise task is `DEFERRED` | Pending |

## M2 - Funnel, conversions, and dashboard

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-201 | Instrument landing-page views and selected CTAs | `NOT_STARTED` | Engineering | CWA-101, CWA-102 | Approved page and CTA events fire once per defined interaction with no prohibited parameters | Pending |
| CWA-202 | Instrument the booking funnel | `NOT_STARTED` | Engineering | CWA-101 to CWA-104 | Approved booking start, service, details, schedule, checkout, error, and exit signals support funnel and abandonment reporting | Pending |
| CWA-203 | Instrument login completion | `NOT_STARTED` | Engineering | CWA-104 | Successful login is measured once and supports campaign-to-login and login-without-booking segments | Pending |
| CWA-204 | Emit verified purchase analytics | `NOT_STARTED` | Engineering | CWA-003, CWA-101 | Authoritative successful payment emits one ecommerce purchase with stable transaction ID, currency, value, coupon, and service items | Pending |
| CWA-205 | Configure and validate Google Ads conversion measurement | `NOT_STARTED` | Marketing / Engineering | CWA-004, CWA-103, CWA-204 | Auto-tagging, account linking, conversion action, value/currency, deduplication, and the accepted enhanced-conversion approach are validated | Pending |
| CWA-206 | Configure GA4 dimensions, key events, funnels, and audiences | `NOT_STARTED` | Marketing / Engineering | CWA-201 to CWA-205 | GA4 can answer every approved first-release reporting question using documented reports or explorations | Pending |
| CWA-207 | Build the approved reporting dashboard | `NOT_STARTED` | Marketing / Engineering | CWA-002, CWA-206 | Dashboard presents acquisition, funnel, campaign, services, revenue, login, abandonment, and location views with filters and definitions | Pending |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-301 | Add automated analytics tests | `NOT_STARTED` | Engineering | CWA-201 to CWA-207 | Tests cover event triggers, payload allowlists, deduplication, consent, identity reset, and failure isolation | Pending |
| CWA-302 | Run browser, DebugView, Tag Assistant, and Ads diagnostics | `NOT_STARTED` | Engineering / Marketing | CWA-301 | Supported devices and navigation paths produce the approved events and attribution without duplicates | Pending |
| CWA-303 | Reconcile payment and service data | `NOT_STARTED` | Engineering / Finance | CWA-204, CWA-302 | Sample transactions match purchase IDs, values, currencies, coupons, and service items; known measurement loss is documented | Pending |
| CWA-304 | Complete privacy and security release gates | `NOT_STARTED` | Privacy / Security / Engineering | CWA-301, CWA-302 | All release-blocking checks in `SECURITY-TEST-PLAN.md` pass and evidence is recorded | Pending |
| CWA-305 | Roll out, monitor, and approve the first reporting window | `NOT_STARTED` | Engineering / Marketing / Operations | CWA-303, CWA-304 | Staged rollout, rollback readiness, initial dashboards, discrepancy review, and stakeholder approval are recorded | Pending |

## Future suggestions outside the first release

These are not implementation tasks and do not count toward milestone totals:

- Consider enabling GA4 BigQuery export if longer retention, raw event analysis, authoritative joins, or reporting limits justify the additional operational surface.
- Consider session replay or heatmaps only if aggregate funnel data cannot explain significant abandonment.
- Consider server-side tagging after the baseline implementation establishes a concrete data-quality or performance need.
