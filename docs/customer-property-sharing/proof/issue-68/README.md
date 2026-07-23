# Issue #68 product-correction proof

The authoritative correction pass was captured on 23 July 2026 from the
production build with an isolated disposable PostgreSQL database. It used one
synthetic customer, three synthetic completed properties, five accepted current
media records, two single-property links, and one master link. The temporary
server and database were removed after verification.

The supplied reference HTML was inspected directly for its `modal`, `pv-*`,
`desk`, `phone`, `sp-*`, `col-grid-d`, and `cmini` contracts. The
`contextual-sharing-*` screenshots are authoritative for the latest
authenticated placement correction. Other files beginning with `corrected-`
remain authoritative for the listing dialog, public preview, and public pages.
Older PNG files and the earlier corrected management screenshots are retained
only as historical evidence and must not be used to infer the current
authenticated layout.

## Corrected authenticated UI

- [`contextual-sharing-desktop.jpg`](contextual-sharing-desktop.jpg) and
  [`contextual-sharing-phone.jpg`](contextual-sharing-phone.jpg) show the single
  Delivered files project list. Eligible completed cards contain **Create Share
  Link**; an already-shared card contains **Manage Share Link**. There is no
  standalone Ready/Shared/Master management section or duplicated project list.
- [`corrected-listing-form-desktop.jpg`](corrected-listing-form-desktop.jpg) and
  [`corrected-listing-form-phone.jpg`](corrected-listing-form-phone.jpg) show the
  reference-width listing form, explicit bordered controls, readable native
  dropdown choices, segmented furnishing control, owner contact fields, and
  Generate & Copy Link action.
- [`corrected-preview-desktop.jpg`](corrected-preview-desktop.jpg) and
  [`corrected-preview-phone.jpg`](corrected-preview-phone.jpg) show that card
  preview embeds the actual public page and switches between Desktop and Phone
  frames.
- [`full-viewport-public-single-desktop.jpg`](full-viewport-public-single-desktop.jpg)
  and [`full-viewport-public-single-phone.jpg`](full-viewport-public-single-phone.jpg)
  show the latest edge-to-edge single-property layout with no outer card
  border, radius, shadow, or page gutter. The unavailable hero and thumbnail
  are deliberate proof of the isolated fixture's missing synthetic object.

The isolated fixture deliberately used non-existent synthetic object URLs, so
its corrected preview/public screenshots exercise the designed media-error
fallback. Inline image/video bytes, range handling, MIME headers, and private
object-URL isolation remain covered by the route/service/storage tests and the
original live-object proof.

## Corrected public UI

- [`corrected-public-single-desktop.jpg`](corrected-public-single-desktop.jpg)
  and [`corrected-public-single-phone.jpg`](corrected-public-single-phone.jpg)
  show the reference-style full property showcase, metadata, highlights,
  contact actions, and branding.
- [`corrected-public-master-desktop.jpg`](corrected-public-master-desktop.jpg)
  and [`corrected-public-master-phone.jpg`](corrected-public-master-phone.jpg)
  show the compact two-property curated collection.

## Browser assertions

- Contextual placement was verified at 1440 × 900 and 390 × 844. Both sizes had
  one Delivered files list, no standalone sharing manager, and no horizontal
  overflow.
- The public single showcase was verified at the same two viewport sizes. Its
  outer article matched the viewport origin and width, had no card treatment,
  and introduced no horizontal overflow. Above the desktop split breakpoint,
  its media hero filled the available viewport height above the thumbnail strip
  while photo/video content used contain sizing without cropping.
- The Create action opened the selected completed project's listing form.
  Existing shares exposed a named Manage action with Copy Link, Preview, Edit,
  and Disable/Enable controls. Preview opened the actual public route in an
  iframe.
- The public gallery ordered images before video and 360 media.
- A real accepted HTTPS 360 delivery rendered as an interactive no-referrer
  iframe in the main viewer at 1440 × 900 and 390 × 844. The page contained one
  text/icon 360 media tile alongside photo/video, no 360 image thumbnail, no
  standalone 360 action, no Video Walkthrough action, and no horizontal
  overflow. The bearer and iframe URL were excluded from proof.
- The contextual single-share dialog contained Copy Link, Disable/Enable, Edit,
  and Preview. It contained no rotate, revoke, refresh-snapshot, expiry,
  delete-link, agent-assignment, visitor-contact, or duplicate-project controls.
- Disabling the single link immediately produced the generic unavailable page.
  Re-enabling restored the exact same public ID and URL. The stored total moved
  only for successful landing renders and remained one simple aggregate.
- The master landing contained exactly the two explicitly selected properties
  and opened each under the same stable public ID.

## Verification recorded

- Focused sharing/model/migration/action/management/public-route/storage command:
  **11 suites and 64 tests passed**; the guarded PostgreSQL suite was skipped in
  that ordinary command.
- Reserved disposable-PostgreSQL command: **1 suite and 5 tests passed**,
  covering booking-only row locks across the optional listing join,
  single/master/listing uniqueness, and 40 concurrent lossless total-view
  increments.
- Focused changed-file Biome check: no errors; the CSS module retains only
  non-blocking descending-specificity warnings caused by independent
  reference-matched component selectors.
- `npm run build`: passed, compiled and generated **74 routes**. It retained the
  pre-existing non-fatal `/admin/promotions` dynamic-server diagnostic.
- `git diff --check`: passed.
