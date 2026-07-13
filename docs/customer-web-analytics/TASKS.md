# Customer web analytics task tracker

> Historical delivery ledger. GitHub Issues and Project 1 are authoritative for current work and status. This file preserves migration evidence and must not be used for dispatch.

- Last updated: 2026-07-03
- Overall implementation status: `DEFERRED`
- Current milestone: `DEFERRED`

## Hold status

This feature has been put on hold and deferred to a later release.
Leave all implementation tasks in `DEFERRED` until work is explicitly resumed.

The statuses below are a migration snapshot, not live workflow state.

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Measurement contract and decisions | `DEFERRED` | 0 | 4 | 1-2 days |
| M1 - Analytics and attribution foundation | `DEFERRED` | 0 | 5 | 2-3 days |
| M2 - Funnel, conversions, and dashboard | `DEFERRED` | 0 | 7 | 3-5 days |
| M3 - Verification and rollout | `DEFERRED` | 0 | 5 | 1-2 days |

## M0 - Measurement contract and decisions

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-001 | Approve first-release measurement scope and success criteria | `DEFERRED` | Product / Marketing / Engineering | None | Required reports, conversion definitions, reporting timezone, and success criteria are accepted in `DECISIONS.md` | Deferred on 2026-07-03; feature put on hold |
| CWA-002 | Approve analytics, Ads, dashboard, identity, consent, and attribution choices | `DEFERRED` | Product / Marketing / Engineering / Privacy | CWA-001 | Every release-gating `PROPOSED` decision is accepted, rejected, or superseded | Deferred on 2026-07-03; feature put on hold |
| CWA-003 | Define the event and parameter dictionary | `DEFERRED` | Engineering / Marketing | CWA-001, CWA-002 | Each event has a trigger, scope, parameters, deduplication rule, owner, and prohibited-data review | Deferred on 2026-07-03; feature put on hold |
| CWA-004 | Obtain and validate external account access | `DEFERRED` | Marketing / Operations | CWA-002 | Required GA4, Google Ads, tag, consent, and dashboard access is confirmed without recording sensitive identifiers in tracked docs | Deferred on 2026-07-03; feature put on hold |

## M1 - Analytics and attribution foundation

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-101 | Implement a vendor-isolated analytics wrapper | `DEFERRED` | Engineering | CWA-003 | Page, event, identity, consent, and ecommerce calls use one tested interface and fail without breaking product flows | Deferred on 2026-07-03; feature put on hold |
| CWA-102 | Implement consent-aware initialization and state changes | `DEFERRED` | Engineering / Privacy | CWA-002, CWA-101 | Collection behavior matches the accepted consent policy before and after consent updates | Deferred on 2026-07-03; feature put on hold |
| CWA-103 | Capture campaign and click attribution | `DEFERRED` | Engineering | CWA-002, CWA-101 | Approved UTM and Google click identifiers survive supported navigation and are associated with the booking according to the accepted attribution rule | Deferred on 2026-07-03; feature put on hold |
| CWA-104 | Implement approved analytics identity behavior | `DEFERRED` | Engineering | CWA-002, CWA-101 | Anonymous and authenticated activity follow the approved User-ID and logout/reset rules without sending direct identifiers | Deferred on 2026-07-03; feature put on hold |
| CWA-105 | Add minimal attribution persistence | `DEFERRED` | Engineering | CWA-002, CWA-103 | If approved, migration/model store only the accepted first-party attribution fields with indexes, retention behavior, and tests; otherwise task is `DEFERRED` | Deferred on 2026-07-03; feature put on hold |

## M2 - Funnel, conversions, and dashboard

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-201 | Instrument landing-page views and selected CTAs | `DEFERRED` | Engineering | CWA-101, CWA-102 | Approved page and CTA events fire once per defined interaction with no prohibited parameters | Deferred on 2026-07-03; feature put on hold |
| CWA-202 | Instrument the booking funnel | `DEFERRED` | Engineering | CWA-101 to CWA-104 | Approved booking start, service, details, schedule, checkout, error, and exit signals support funnel and abandonment reporting | Deferred on 2026-07-03; feature put on hold |
| CWA-203 | Instrument login completion | `DEFERRED` | Engineering | CWA-104 | Successful login is measured once and supports campaign-to-login and login-without-booking segments | Deferred on 2026-07-03; feature put on hold |
| CWA-204 | Emit verified purchase analytics | `DEFERRED` | Engineering | CWA-003, CWA-101 | Authoritative successful payment emits one ecommerce purchase with stable transaction ID, currency, value, coupon, and service items | Deferred on 2026-07-03; feature put on hold |
| CWA-205 | Configure and validate Google Ads conversion measurement | `DEFERRED` | Marketing / Engineering | CWA-004, CWA-103, CWA-204 | Auto-tagging, account linking, conversion action, value/currency, deduplication, and the accepted enhanced-conversion approach are validated | Deferred on 2026-07-03; feature put on hold |
| CWA-206 | Configure GA4 dimensions, key events, funnels, and audiences | `DEFERRED` | Marketing / Engineering | CWA-201 to CWA-205 | GA4 can answer every approved first-release reporting question using documented reports or explorations | Deferred on 2026-07-03; feature put on hold |
| CWA-207 | Build the approved reporting dashboard | `DEFERRED` | Marketing / Engineering | CWA-002, CWA-206 | Dashboard presents acquisition, funnel, campaign, services, revenue, login, abandonment, and location views with filters and definitions | Deferred on 2026-07-03; feature put on hold |

## M3 - Verification and rollout

| ID | Task | Status | Owner | Dependencies | Acceptance criteria | Evidence |
|---|---|---|---|---|---|---|
| CWA-301 | Add automated analytics tests | `DEFERRED` | Engineering | CWA-201 to CWA-207 | Tests cover event triggers, payload allowlists, deduplication, consent, identity reset, and failure isolation | Deferred on 2026-07-03; feature put on hold |
| CWA-302 | Run browser, DebugView, Tag Assistant, and Ads diagnostics | `DEFERRED` | Engineering / Marketing | CWA-301 | Supported devices and navigation paths produce the approved events and attribution without duplicates | Deferred on 2026-07-03; feature put on hold |
| CWA-303 | Reconcile payment and service data | `DEFERRED` | Engineering / Finance | CWA-204, CWA-302 | Sample transactions match purchase IDs, values, currencies, coupons, and service items; known measurement loss is documented | Deferred on 2026-07-03; feature put on hold |
| CWA-304 | Complete privacy and security release gates | `DEFERRED` | Privacy / Security / Engineering | CWA-301, CWA-302 | All release-blocking checks in `SECURITY-TEST-PLAN.md` pass and evidence is recorded | Deferred on 2026-07-03; feature put on hold |
| CWA-305 | Roll out, monitor, and approve the first reporting window | `DEFERRED` | Engineering / Marketing / Operations | CWA-303, CWA-304 | Staged rollout, rollback readiness, initial dashboards, discrepancy review, and stakeholder approval are recorded | Deferred on 2026-07-03; feature put on hold |

## Future suggestions outside the first release

These are not implementation tasks and do not count toward milestone totals:

- Consider enabling GA4 BigQuery export if longer retention, raw event analysis, authoritative joins, or reporting limits justify the additional operational surface.
- Consider session replay or heatmaps only if aggregate funnel data cannot explain significant abandonment.
- Consider server-side tagging after the baseline implementation establishes a concrete data-quality or performance need.
