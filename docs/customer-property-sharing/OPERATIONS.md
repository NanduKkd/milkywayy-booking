# Customer property showcase operations

## Configuration

- `NEXT_PUBLIC_BASE_URL` supplies the public origin used for every persisted
  stable link.
- Existing owned S3 configuration is used by server-side inline streaming.
- No property-share-specific secret is required. In particular, there is no
  receipt secret, contact retention setting, or public download TTL.

Development request logging ignores `/share/` and the public property-share API
prefix so bearer path values are not printed by Next.js. Production ingress,
CDN, APM, WAF, and reverse-proxy access logs must also suppress or
deterministically redact those path segments. Never log full public URLs,
listing contact fields, object URLs, range contents beyond non-secret aggregate
failure counts, network addresses, or user-agent values.

## Rollout

1. Apply migrations `20260722090000-create-property-sharing.js` and
   `20260724190000-create-property-share-media-snapshots.js` in order before
   starting code that imports the snapshot model.
2. Run focused migration/model/listing/service/action/public-media/UI tests and
   the real PostgreSQL uniqueness/contention suite.
3. Run authenticated dashboard/file/download/workflow compatibility suites.
4. Run a production build, changed-file Biome, and `git diff --check`.
5. In a synthetic environment verify listing create/edit, single/master pages,
   card preview at Phone/Desktop widths, inline image/video/range behavior,
   Open Graph JPEG preview dimensions/content type/byte ceiling and malformed
   or oversized preview-source rejection,
   phone/WhatsApp actions, stable copy-after-reload, disable/re-enable,
   automatic media synchronization, stale-version rejection, unselected rejection, and
   total counts.
6. Confirm every request-log layer redacts bearer-bearing routes.

The snapshot migration backfills each existing selected property with its
current safe-looking under-review or accepted photo, video, and 360 membership.
Public resolution still revalidates the exact file/version, booking state,
storage/link safety, and supported media contract before serving anything.

## Owner support actions

- **Edit listing:** changes owner-authored public copy/contact fields without
  changing media membership.
- **Copy link:** always copies the same persisted public URL, including after a
  dashboard reload.
- **Disable/re-enable:** takes effect on the next public resolution and keeps
  the same URL and total link views.
- **Automatic media reconciliation:** upload, replacement, review,
  publication, and deletion transitions transactionally merge safe current
  versions into affected single/master memberships. New logical files append,
  replacements retain preferences, and disallowed media is removed.
- **Update master:** replaces the explicit ordered property selection.

## Monitoring

Monitor aggregate, non-secret signals only:

- generic public unavailable/error and inline-media failure counts;
- generic Open Graph preview rejection counts for source-size, decoding, and
  owned-storage failures, without route paths or object identifiers;
- landing transaction latency and total-view update contention;
- share/listing uniqueness conflicts and migration health;
- media MIME rejection and range-stream failure counts without URLs or bearers.

Never add token, contact value, IP, user-agent, referrer, fingerprint, location,
cookie, raw event, or stored object URL dimensions.

## Failure modes and rollback

Invalid owned storage, unsafe MIME, stale/changes-requested snapshot media,
unselected media, and malformed or bounded-out preview images fail with the
generic unavailable response. Preview responses are private and `no-store`, so
an enabled-state or snapshot change is not publicly cached. For urgent code rollback,
remove or
disable public and authenticated sharing routes first so distributed links fail
closed while rows remain intact. Do not run schema `down` while listing/share
rows are needed; dropping populated data requires a separate approved decision.
