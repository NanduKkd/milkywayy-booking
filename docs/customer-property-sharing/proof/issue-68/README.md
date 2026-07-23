# Issue #68 product-correction proof

The authoritative correction pass was captured on 23 July 2026 from the
production build with an isolated disposable PostgreSQL database. It used one
synthetic customer, three synthetic completed properties, five accepted current
media records, two single-property links, and one master link. The temporary
server and database were removed after verification.

The supplied reference HTML was inspected directly for its `rcard`, `pshared`,
`mcard`, `actionbar`, `modal`, `pv-*`, `desk`, `phone`, `sp-*`, `col-grid-d`,
and `cmini` contracts. Files beginning with `corrected-` are the authoritative
screenshots for the simplified product contract. Older PNG files in this folder
are retained only as historical evidence for the superseded first pass and must
not be used to infer the current link lifecycle.

## Corrected authenticated UI

- [`corrected-management-desktop.jpg`](corrected-management-desktop.jpg) and
  [`corrected-management-phone.jpg`](corrected-management-phone.jpg) show the
  compact reference-style Ready to Share and Shared Properties surfaces with no
  extra Properties title/intro panel.
- [`corrected-listing-form-desktop.jpg`](corrected-listing-form-desktop.jpg) and
  [`corrected-listing-form-phone.jpg`](corrected-listing-form-phone.jpg) show the
  reference-width listing form, segmented furnishing control, owner contact
  fields, and Generate & Copy Link action.
- [`corrected-preview-desktop.jpg`](corrected-preview-desktop.jpg) and
  [`corrected-preview-phone.jpg`](corrected-preview-phone.jpg) show that card
  preview embeds the actual public page and switches between Desktop and Phone
  frames.

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

- Desktop management used a 1440 × 900 viewport; the browser content capture
  was 1425 × 891. Phone management used a 390 × 844 viewport; the browser
  content capture was 375 × 812.
- Management, form, preview, single showcase, and master collection had no
  horizontal overflow at either responsive width.
- Shared cards were keyboard-addressable named buttons, and clicking a card
  opened the actual public route in an iframe.
- The public gallery ordered images before tour/video media.
- The dashboard contained Copy Link, Disable/Enable, Edit, select-multiple, and
  master controls. It contained no rotate, revoke, refresh-snapshot, expiry,
  delete-link, agent-assignment, or visitor-contact controls.
- Disabling the single link immediately produced the generic unavailable page.
  Re-enabling restored the exact same public ID and URL. The stored total moved
  only for successful landing renders and remained one simple aggregate.
- The master landing contained exactly the two explicitly selected properties
  and opened each under the same stable public ID.

## Verification recorded

- Focused sharing/model/migration/action/management/public-route/storage command:
  **10 suites and 52 tests passed**; the guarded PostgreSQL suite was skipped in
  that ordinary command.
- Reserved disposable-PostgreSQL command: **1 suite and 4 tests passed**,
  covering single/master/listing uniqueness and 40 concurrent lossless
  total-view increments.
- Focused changed-file Biome check: no errors; the CSS module retains only
  non-blocking descending-specificity warnings caused by independent
  reference-matched component selectors.
- `npm run build`: passed, compiled and generated **74 routes**. It retained the
  pre-existing non-fatal `/admin/promotions` dynamic-server diagnostic.
- `git diff --check`: passed.
