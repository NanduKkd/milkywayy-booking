# Issue #68 product-correction proof

The authoritative correction pass and follow-up browser review were captured
on 23 July 2026. The production-build pass used an isolated disposable
PostgreSQL database with one synthetic customer, three synthetic completed
properties, five accepted current media records, two single-property links, and
one master link. The temporary server and database were removed after
verification.

The supplied reference HTML was inspected directly for its `rcard`, `pshared`,
`mcard`, `actionbar`, `modal`, `pv-*`, `desk`, `phone`, `sp-*`, `col-grid-d`,
and `cmini` contracts. The files beginning with `browser-review-` are the
authoritative evidence for the final placement and public collection review.
The `corrected-*` screenshots remain authoritative for the listing form,
preview, and single-property page contracts. Older PNG files and
`contextual-sharing-*` files are retained only as historical evidence for
superseded management iterations.

## Corrected authenticated UI

- [`browser-review-management.png`](browser-review-management.png) shows the
  Shared Properties manager without a separate Ready to Share section. It also
  captures the directly clickable visual selection controls and two-property
  sticky update action.
- [`browser-review-files-list.png`](browser-review-files-list.png) shows Create
  Share Link restored to each eligible unshared Delivered files card. Already
  shared properties do not repeat that action.
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
  show the earlier compact curated collection.
- [`browser-review-master-collection.png`](browser-review-master-collection.png)
  supersedes that collection shell: it fills the viewport with no outer margin,
  border, radius, or shadow and contains no duplicate collection-level contact
  card.
- [`browser-review-master-property.png`](browser-review-master-property.png)
  shows the selected-property return path with deliberate top and horizontal
  spacing. At the reviewed 880 × 964 viewport, gallery thumbnails use compact
  120 × 76px tiles rather than stretching across the media column. The
  property-level agent contact remains available.

## Browser assertions

- Management was verified at 1440 × 900 and 390 × 844 during the production
  pass, then at 880 × 964 for the follow-up review. Shared cards, listing form,
  selection mode, action bar, and Master Links introduced no horizontal
  overflow; the Delivered files list remained below the manager.
- The public single showcase was verified at the same two viewport sizes. Its
  outer article matched the viewport origin and width, had no card treatment,
  and introduced no horizontal overflow. Above the desktop split breakpoint,
  its media hero filled the available viewport height above the thumbnail strip
  while photo/video content used contain sizing without cropping.
- Create Share Link on an eligible unshared Delivered files card opened that
  property's listing form. Shared cards exposed Copy Link, Preview, Edit, and
  Disable/Enable controls, while card selection required at least two
  properties before master creation. Both the whole card and its visible check
  control toggled selection; the direct check-control test changed the selected
  count from three to two. Preview opened the actual public route in an iframe.
- The public gallery ordered images before video and 360 media.
- A real accepted HTTPS 360 delivery rendered as an interactive no-referrer
  iframe in the main viewer at 1440 × 900 and 390 × 844. The page contained one
  text/icon 360 media tile alongside photo/video, no 360 image thumbnail, no
  standalone 360 action, no Video Walkthrough action, no hero media-type badge,
  and no horizontal overflow. The bearer and iframe URL were excluded from
  proof.
- The management surface contained stable Copy Link, Disable/Enable, Edit,
  Preview, Select Multiple, and Master Links controls. It contained no rotate,
  revoke, refresh-snapshot, expiry, delete-link, agent-assignment, or
  visitor-contact controls.
- Disabling the single link immediately produced the generic unavailable page.
  Re-enabling restored the exact same public ID and URL. The stored total moved
  only for successful landing renders and remained one simple aggregate.
- The reviewed master landing matched the 880 × 964 viewport exactly
  (`x: 0`, `y: 0`, `width: 880`, `height: 964`) with `0px` border and radius,
  `none` box shadow, no horizontal overflow, and zero collection-level contact
  cards or WhatsApp links. It opened each property under the same stable public
  ID.
- The selected master property return path used 16px top, 26px left/right, and
  14px bottom padding instead of touching the viewport edge.

## Verification recorded

- Focused sharing/model/migration/action/management/public-route/storage command:
  **12 suites and 61 tests passed**; the guarded PostgreSQL suite was skipped in
  that ordinary command.
- Reserved disposable-PostgreSQL command: **1 suite and 5 tests passed**,
  covering booking-only row locks across the optional listing join,
  single/master/listing uniqueness, and 40 concurrent lossless total-view
  increments.
- Focused changed-file Biome check: passed with no errors or warnings.
- `npm run build`: passed, compiled and generated **74 routes**. It retained the
  pre-existing non-fatal `/admin/promotions` dynamic-server diagnostic.
- `git diff --check`: passed.
