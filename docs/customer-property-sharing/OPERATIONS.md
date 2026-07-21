# Customer property sharing operations

## Configuration

- `PROPERTY_SHARE_RECEIPT_SECRET` signs public property receipts. Production
  requires at least 32 characters. Keep the value in the secret manager and
  never print or commit it.
- `NEXT_PUBLIC_BASE_URL` supplies the public origin returned on create/rotate.
- Existing S3 delivery configuration controls file delivery; public property
  shares additionally cap a signed download at five minutes (or the lower
  configured TTL).

Development request logging ignores `/share/` and the public property-share API
prefix so bearer path values are not printed by Next.js. Production ingress,
CDN, APM, WAF, and reverse-proxy access logs must also suppress or deterministically
redact those route path segments before rollout. Do not place full request URLs,
cookies, contact bodies, storage URLs, network addresses, or user-agent values
in application/security logs.

## Rollout

1. Configure the receipt secret and verify secret-safe environment preflight.
2. Apply the property-sharing migration before starting code that imports the
   new models.
3. Run focused migration, model, service, action, route, component, and existing
   delivery/dashboard compatibility tests.
4. Run a production-mode build and changed-file Biome check.
5. In a synthetic environment, verify single/master creation, per-property
   contact gates, pinned file delivery, disable/re-enable, rotation, invalid
   token behavior, aggregate changes, and responsive layouts.
6. Confirm every request-log layer redacts the bearer route.

No backfill is required.

## Contact retention and cleanup

Owner reads include only contacts with `expires_at` later than the current time,
so data becomes inaccessible exactly at the 90-day boundary even before physical
cleanup. Each link returns at most its 100 newest unexpired contacts. Each
Properties dashboard read deletes at most 200 expired rows using the expiry
index. These bounded read and lazy-cleanup limits prevent unbounded requests
while steadily removing expired data. A future scheduled cleanup may call the
same bounded policy if volume warrants it; it must not export or log contact
values.

## Owner support actions

- **Disable:** takes effect on the next public resolution and preserves token,
  snapshot, aggregates, and unexpired contacts.
- **Re-enable:** restores resolution for the same distributed token.
- **Refresh snapshot:** re-resolves the existing selected properties and
  replaces only file-version memberships with currently eligible versions.
- **Update master:** replaces the explicit property selection and snapshots the
  selected properties; removed-property contacts cascade with membership.
- **Rotate:** atomically replaces the digest and increments credential version.
  The old URL and its receipts fail immediately; analytics remain.
- **Revoke:** permanently disables the row and frees the owner/property or owner
  master uniqueness slot. It cannot be re-enabled.

## Monitoring

Monitor aggregate, non-secret signals only:

- generic public not-found/error rate and file-signing failure count;
- contact validation and throttling counts without bodies or network values;
- landing transaction latency and daily-upsert contention;
- expired-contact backlog count and bounded deletion count;
- share creation uniqueness conflicts and migration/index health.

Never add token, contact, IP, user-agent, referrer, fingerprint, location,
cookie, or stored delivery URL dimensions to metrics.

## Failure modes and rollback

Missing or weak production receipt configuration makes contact receipt issuance
fail closed. Invalid storage ownership makes that public file action unavailable
without exposing the persisted URL. Stale snapshots fail with the same generic
not-found response until the owner refreshes.

For urgent code rollback, remove/disable the public and authenticated sharing
routes first; distributed links then fail closed while data remains intact. Do
not run the schema `down` migration while share, aggregate, or contact rows are
needed. Dropping populated tables requires a separate approved retention/export
decision. When safe and empty, rollback drops contacts, daily aggregates, file
memberships, property memberships, links, and finally the enum in dependency
order.
