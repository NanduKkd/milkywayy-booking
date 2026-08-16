# Customer web analytics operations

- Last updated: 2026-07-01
- Status: `DRAFT`

## Operational principles

- Analytics must fail open from the product's perspective: collection failure cannot block customer workflows.
- Payment confirmation must not wait on third-party analytics delivery.
- Exact account IDs, production hostnames, secret values, and operator-specific commands must remain in `docs/private/PRODUCTION-DEPLOYMENT.md`, not tracked documentation.
- Configuration changes require validation in both a non-production environment and the production reporting property/account.

## Configuration inventory

Final variable names depend on accepted implementation decisions. The rollout is
expected to require references to:

- GA4 measurement/property configuration
- Google Ads account and conversion action configuration
- selected dashboard workspace/report
- consent configuration
- optional enhanced-conversion configuration
- optional attribution retention and conversion-delivery configuration

Public browser configuration must contain only values designed to be public.
Secrets or privileged API credentials must remain server-side and must not be
logged or embedded in client bundles.

## Pre-release setup

1. Accept all release-gating decisions in `DECISIONS.md`.
2. Confirm account ownership and least-privilege access.
3. Create or validate separate development/test and production data paths where practical.
4. Record exact external identifiers only in the approved private operations document.
5. Configure GA4 data retention, internal/developer traffic filters, key events, and custom definitions according to the accepted contract.
6. Enable and verify Google Ads auto-tagging and account linkage.
7. Configure the selected conversion action without making duplicate purchase actions primary for bidding.
8. Configure dashboard ownership and viewer access.
9. Apply any approved database migration before code that writes attribution records.

## Staged rollout

### Stage 1 - Development validation

- Use test/debug collection only.
- Exercise landing, booking, login, failure, payment, and consent transitions.
- Confirm payload allowlists and absence of direct customer data.

### Stage 2 - Production shadow validation

- Enable collection for internal/test traffic without treating test conversions as business results.
- Verify auto-tagging survives redirects and client navigation.
- Confirm payment conversion deduplication and dashboard ingestion.

### Stage 3 - Limited production release

- Enable for an agreed traffic slice or monitoring window where the selected tooling supports it.
- Compare landing sessions, booking starts, purchases, service items, values, and locations with expected records.
- Review Ads versus GA4 discrepancies before changing bidding strategy.

### Stage 4 - General release

- Publish the approved dashboard.
- Record baseline conversion and discrepancy ranges.
- Assign ownership for weekly validation and event-contract changes.

## Monitoring

Monitor at minimum:

- event volume changes by event name
- purchase events versus successful transactions
- duplicate or missing transaction IDs
- missing currency, value, service items, campaign, or location dimensions
- unattributed/unknown campaign rate
- Google Ads tag and conversion diagnostics
- consent-mode distribution according to the accepted policy
- application errors caused by analytics integration
- dashboard connector freshness and access failures

Alerts and acceptable discrepancy thresholds remain to be decided during CWA-001
and CWA-002.

## Reconciliation

For sampled reporting periods:

1. Compare successful transaction count and value with GA4 purchase IDs and revenue.
2. Confirm each purchase's service items match the booking record.
3. Separate expected loss caused by consent or blocking from implementation defects.
4. Review Google Ads conversions by conversion action to prevent duplicate primary conversions.
5. Record unexplained discrepancies and remediation evidence in the authoritative local task and its verification report.

GA4/Ads revenue is a measurement view, not the accounting ledger.

## Rollback

Rollback should be possible independently at these layers:

- disable client analytics initialization through the approved configuration mechanism
- disable individual event emissions without removing booking behavior
- change the Google Ads conversion action from primary to secondary or disable it
- unpublish or restrict the dashboard
- stop optional attribution writes while retaining a backward-compatible nullable schema
- revert application code through the normal deployment process

Do not drop collected attribution data during an urgent rollback. Data deletion or
migration reversal requires a separate reviewed operation consistent with the
accepted retention policy.

## Support and change control

- Event semantic changes require an update to the event dictionary and `DECISIONS.md` before deployment.
- New event parameters require a prohibited-data review.
- Dashboard formula changes require owner approval and a dated definition update.
- Campaign or conversion-action configuration changes must be recorded without committing sensitive account details.
- Known GA4/Ads latency, consent loss, thresholds, and attribution differences must be explained to dashboard users.

## Future operational suggestion

Evaluate GA4 BigQuery export only when a documented need exists for longer raw
retention, complex joins, unsampled analysis, or recovery from dashboard/API
limitations. It is not part of the initial rollout.
