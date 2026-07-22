# Issue #68 corrective browser proof

Captured on 22 July 2026 from the production build at the required
1440 × 900 and 390 × 844 viewports. The proof used a disposable reserved-prefix
PostgreSQL database, one synthetic owner, three synthetic completed properties,
and nine synthetic JPEG objects attached to real `ACCEPTED` current delivery
file versions. The database, temporary bearer material, and proof objects were
destroyed after capture.

The supplied reference HTML was inspected directly for its `rcard`, `pshared`,
`mcard`, `actionbar`, `desk`, `desk-grid`, `phone`, `sp-*`, `col-grid-d`, and
`cmini` contracts. The in-app browser refused direct `file://` navigation under
its local-file safety policy and explicitly prohibited workarounds, so a
browser-rendered reference half could not be captured. The implementation
screenshots below are therefore paired by viewport and surface, while visual
comparison to the reference was performed from the supplied HTML/CSS source.

## Authenticated Properties management

- [`authenticated-management-desktop.png`](authenticated-management-desktop.png)
  and [`authenticated-management-narrow.png`](authenticated-management-narrow.png)
  show the application shell, Ready to Share, and the responsive management
  introduction.
- [`authenticated-shared-properties-desktop.png`](authenticated-shared-properties-desktop.png)
  and [`authenticated-shared-properties-narrow.png`](authenticated-shared-properties-narrow.png)
  show reference-style shared-property cards, live state, price/type, request
  views, controls, and the two-column-to-one-column transition.
- [`authenticated-listing-form-desktop.png`](authenticated-listing-form-desktop.png)
  and [`authenticated-listing-form-narrow.png`](authenticated-listing-form-narrow.png)
  show booking facts plus every owner-authored listing field. The desktop form
  phone value was replaced with `[redacted phone]` in the unsaved browser form
  before capture.
- [`authenticated-master-selection-cards-desktop.png`](authenticated-master-selection-cards-desktop.png)
  shows the two selected property cards. [`authenticated-master-selection-desktop.png`](authenticated-master-selection-desktop.png)
  shows the fixed action bar together with the unchanged authenticated Files
  surface and its private Download actions.
- [`authenticated-master-links-desktop.png`](authenticated-master-links-desktop.png)
  and [`authenticated-master-links-narrow.png`](authenticated-master-links-narrow.png)
  show the collection card, state controls, request-view analytics, and
  responsive layout.

## Buyer-facing showcase and collection

- [`public-single-desktop.png`](public-single-desktop.png) and
  [`public-single-narrow.png`](public-single-narrow.png) show the `sp-*`
  hero/gallery, metadata chips, description, highlights, and desktop/phone
  layouts. [`public-single-contact-narrow.png`](public-single-contact-narrow.png)
  records the owner contact card, click-to-call presentation, WhatsApp CTA, and
  Milkywayy footer.
- [`public-master-desktop.png`](public-master-desktop.png) and
  [`public-master-narrow.png`](public-master-narrow.png) show exactly the two
  selected `cmini` collection cards. [`public-master-selected-narrow.png`](public-master-selected-narrow.png)
  shows one card opened as the full showcase with a back-to-collection path
  under the same bearer.
- [`public-old-token-rejected.png`](public-old-token-rejected.png) shows the
  uniform unavailable surface after rotation invalidated the old bearer.

All public screenshots use the fixed synthetic phone sentinel
`+971500000000`; it is not a real customer or contact. Screenshots contain no
live customer data, bearer token, persisted media URL, browser address bar,
cookie, host, or environment detail. Every tracked PNG was mechanically
verified as exactly 1440 × 900 or 390 × 844. The browser captured the narrow
content area at 375 × 812 inside a verified 390 × 844 viewport; its PNG canvas
was padded, without rescaling or cropping the UI, to preserve the requested
artifact dimensions.

## Browser and live-route assertions

- Selecting gallery item 2 changed the active hero to view 2.
- Single showcase DOM: `forms=0`, `download attributes=0`, authenticated
  download links `=0`, phone links `=1`, WhatsApp links `=1`, horizontal
  overflow `=false` at desktop and phone widths.
- Master landing DOM: selected collection cards `=2`, `forms=0`, download
  attributes `=0`, authenticated download links `=0`, phone links `=1`,
  WhatsApp links `=1`, horizontal overflow `=false` at desktop and phone
  widths.
- Opening the second master card produced a full showcase, one back link, and
  `sameBearer=true` without exposing an unselected property.
- A live inline-media request returned `200 image/jpeg`,
  `Cache-Control: private, no-store, max-age=0`, `nosniff`, no
  `Content-Disposition`, and did not increment page analytics. A
  `Range: bytes=0-63` request returned `206` with `Content-Range`.
- One successful landing render incremented the aggregate by exactly one.
  Media requests incremented it by zero.
- Disabling the master link changed the public landing to `404`; re-enabling
  restored `200`. Rotation replaced the digest, made the old bearer return
  `404`, preserved the aggregate, and the failed stale request incremented it
  by zero.
- The management rotation flow displayed the one-time **Copy secure URL**
  prompt; no plaintext bearer is persisted or recoverable after reload.

Phone and WhatsApp destinations were verified from their validated link
contracts without launching an external phone or messaging application.

## Verification recorded

- Focused feature command (`jest --runInBand --silent --runTestsByPath` over
  property-sharing security/service/action, migration/model, management,
  public-page, media-route, and storage suites): **9 suites, 49 tests passed**.
- Authenticated compatibility command over Files/FileList, dashboard layout,
  Bookings, Invoices, hidden Wallet, Connections, access gate, workflow,
  authenticated download/delivery, actions, and notifications: **18 suites,
  95 tests passed**.
- Real PostgreSQL migration/contention command with the guarded disposable
  database harness: **1 suite, 4 tests passed**. It covered live single/master
  uniqueness, owner+booking listing uniqueness, and 40 concurrent lossless
  aggregate increments.
- Changed-file `biome check`: **26 files checked, no errors or warnings**.
- `npm run build`: **passed**, compiled and generated **74 routes**. It retained
  the pre-existing non-fatal `/admin/promotions` dynamic-server diagnostic.
- `git diff --check`: **passed**.
- Repository Jest baseline: **11 failed, 1 skipped, 191 passed suites; 42
  failed, 4 skipped, 1137 passed tests**. Failures are unrelated baselines in
  PropertyCard autoscroll, OAuth URL/environment expectations, promotion and
  invoice disposable-PostgreSQL opt-in suites, the disposable harness suite,
  and the handoff promotion-preview Jest/ESM integration.
- Repository Biome baseline: **613 files checked; 437 errors and 63 warnings**.
  Changed issue-owned files are clean as recorded above.
