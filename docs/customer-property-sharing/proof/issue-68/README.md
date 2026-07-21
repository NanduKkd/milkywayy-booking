# Issue #68 browser proof

Captured on 22 July 2026 against a disposable local PostgreSQL database with
synthetic users, properties, files, contacts, and credentials. The database and
temporary credential material were destroyed after capture.

## Authenticated Properties surface

- [`authenticated-properties-desktop.png`](authenticated-properties-desktop.png)
  shows the renamed **Properties** tab at `/dashboard/files`, single-link
  creation state, explicit master selection, and the unchanged dashboard shell.
- [`authenticated-properties-narrow.png`](authenticated-properties-narrow.png)
  shows the same canonical surface at a 390 x 844 viewport.
- [`authenticated-analytics-desktop.png`](authenticated-analytics-desktop.png)
  shows enabled status, refresh/disable/rotate/revoke controls, total request
  views, last-viewed time, and the zero-filled trailing 30 Dubai-day chart.
- [`authenticated-analytics-contacts-desktop.png`](authenticated-analytics-contacts-desktop.png)
  shows the single-property aggregate metrics, sanitized recent contacts, and
  the unchanged delivered-file controls below the sharing manager.
- [`authenticated-management-narrow.png`](authenticated-management-narrow.png)
  shows management controls and aggregate analytics at a 390 x 844 viewport.

The phone cells in the recent-contact screenshot were replaced in the local DOM
with `[redacted phone]` immediately before capture. This was a proof-only visual
redaction; no application or persisted data was changed by it.

## Public journeys

- [`public-single-gate-desktop.png`](public-single-gate-desktop.png) shows the
  single-property context and the only two contact inputs: name and phone.
- [`public-single-files-narrow.png`](public-single-files-narrow.png) shows a
  successful receipt-gated file view at a 390 x 844 viewport.
- [`public-master-desktop.png`](public-master-desktop.png) shows exactly the two
  selected properties. The third eligible but unselected property had zero DOM
  matches.
- [`public-master-property-gate.png`](public-master-property-gate.png) shows the
  separate per-property contact gate within a master share.
- [`public-disabled-link.png`](public-disabled-link.png) shows the generic
  response immediately after disabling the single-property link.
- [`public-old-token-rejected.png`](public-old-token-rejected.png) shows the same
  generic response for the old bearer after re-enabling and rotating the link.

## Safe assertions recorded during capture

- A successful single-property submission created an HttpOnly receipt and
  exposed the snapshotted file only after the subsequent server render.
- The receipt-authorized public DOM contained one token-scoped application file
  action, zero external download actions, and no persisted S3/storage URL.
- The master collection contained two selected cards, one name input, one phone
  input, and one return link when a selected property was opened. The unselected
  property was absent; cross-property/file rejection is also covered by the
  focused route and service tests.
- Successful landing totals and daily aggregates remained equal after the
  journey: single `22/22`, master `7/7`. Failed disabled and rotated-token
  requests did not increment them.
- Persisted link credentials were 64-character digests, no plaintext bearer
  matched a stored value, and the pre-rotation single-link digest no longer
  matched after rotation.
- Three unexpired synthetic contact submissions existed at the end of the
  journey. The contact table exposed only ownership/snapshot keys, name, phone,
  expiry, and timestamps.
- Development request output suppressed the bearer-bearing public route
  prefixes. Captured output contained no raw bearer, phone, storage URL, IP,
  user-agent, referrer, or fingerprint analytics.

Screenshots contain no bearer token, phone number, storage URL, customer or
booking identifier, cookie, browser address bar, host, or environment detail.
