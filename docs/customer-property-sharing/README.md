# Customer property showcases

The customer dashboard exposes property-showcase management inside the existing
`/dashboard/files` route. The visible tab and page language say **Properties**,
while authenticated downloads, copy-link delivery,
revisions, replacement states, review deadlines, completion controls, and the
full existing `FileList` retain their authenticated contracts.

An authenticated property owner or real-estate agent can configure one public
listing per owned confirmed, non-cancelled booking as soon as it has a safe
current media file under review or accepted. Booking completion is not
required. Configuration includes listing title, AED price, listing type,
property type, fractional bathrooms, maid's room, square-foot size, built-up
and plot area, furnishing, description, highlights/amenities, contact name, and
contact phone. Bedrooms remain booking-derived. Commercial listings clear and
omit bedroom, bathroom, and maid's-room facts. Price per ft² is derived from
price and the applicable area. Owners may save normalized, owner-scoped contact
presets; selecting one copies its values into the listing snapshot. Buyers
never submit contact data and the feature does not create an agent, team,
assignment, or visitor-contact model.

The owner can publish:

- one stable single-property public link for each configured eligible property;
- one stable master public link containing at least two explicitly selected
  configured properties.

A public single link opens a responsive buyer-facing showcase immediately. A
master link opens a curated collection; selecting a card opens the complete
showcase under the same bearer. Showcases include the safe under-review and
accepted photo/video/360 media synchronized from the safe current delivery
state, listing metadata, description, highlights, telephone and WhatsApp
actions, and Milkywayy branding. They contain no internal review status, buyer
form, delivery manifest, download button, revision control, or authenticated
file route.

The showcase gallery is photo-only: its 3:2 hero, previous/next controls,
counter, and thumbnail strip never duplicate video or 360 deliveries. When
there are more than four photos, the strip shows the first three plus a
`+ N More Photos` tile that opens the photo gallery; four or fewer photos are
shown directly. A separate **Video walkthrough** action opens the selected
video in a modal (or first offers a picker when multiple videos are available).
A separate **360° virtual tour** action opens the validated HTTPS tour in a new
browser tab.

The single-property showcase owns the full browser surface. It has no outer
card border, radius, shadow, or page gutter; the media and listing split fill
the viewport on desktop, and the photo hero uses a stable 3:2 crop. Videos use
contain sizing inside their modal. The layout becomes an edge-to-edge single
column on narrow screens. If an authorized media object is missing, both the
hero and its thumbnail show an explicit unavailable state rather than a broken
image.

The management UI follows the supplied reference with a dedicated **Ready to
Share** card before **Shared Properties**, plus **Master Links**,
select-multiple/action-bar surfaces, a compact listing form, and card-click
preview. Shared cards use a 3:2 cover, live-state control, exact photo/video/360
summary, listing hierarchy, link views, and Copy/View/Edit actions. Eligible
unshared completed or in-review projects also expose **Create Share Link** in
the authenticated `FileList` directly below the manager; published properties
are managed above it. Owners manage property-level media order, visibility,
and cover choice. Owners select two or more shared
property cards—including the visible check control—to create or update the
master collection. Preview embeds the actual public buyer page and can be
switched between Phone and Desktop widths.

The existing authenticated `FileList` remains directly below the sharing
manager with its download, revision, replacement, review, and completion
behavior unchanged.

Safe current under-review or accepted uploads synchronize into every affected
single and master link automatically. New logical files append visibly;
replacement versions inherit their logical-file preferences. Unsafe, private,
changes-requested, deleted, superseded, stale, or unsupported media is removed
or fails closed without owner action.

After the owner creates a share from a Delivered files card, the refreshed
server result is reconciled into both authenticated surfaces: the create action
disappears and the new listing appears in **Shared Properties** immediately,
without a manual browser refresh.

Each valid property showcase publishes listing-specific browser and Open Graph
metadata. The page title and Open Graph title use
`<listing title> | Milkywayy`, the description uses the owner-authored listing
description, and the URL identifies the represented share page. When an
eligible image exists, `og:image` uses a separate token/property/media-scoped
preview route that returns a bounded 1200×630 `image/jpeg` with declared type,
dimensions, and listing-title alt text. It never points at an original or
private object URL. Invalid, unavailable, and image-less links retain generic
or image-less non-enumerating metadata.

The public master collection fills the browser bounds without an outer card
margin, border, radius, or shadow. It does not repeat a collection-level contact
card: contact and WhatsApp actions remain available inside each selected
property's full showcase. The selected-property view keeps an inset,
keyboard-focusable back-to-collection link above the showcase.

Public pages resolve only the exact safe browser-viewable file+version
memberships synchronized for the selected booking. Every request re-checks that each
member is still current, under review or accepted, non-deleted,
non-superseded, selected, visible, and safe. Later uploads and replacements
update active links transactionally while preserving logical-file preferences.
Photos and videos are streamed only
through link/property/file-scoped inline routes, and persisted private object
URLs are never serialized. Validated HTTPS 360 tour links are intentionally
exposed only as new-tab links with a no-referrer policy; they never pass
through the owned object route.

The public identifier is a stable, opaque 256-bit value. A link is deliberately
public and reshareable. The owner can copy it after any reload, disable or
re-enable it; there is no rotate,
revoke, expiry, or one-time-copy lifecycle. The dashboard shows only a total
link-view count. There is no raw view event or visitor-identity store.

Continue with [architecture](./ARCHITECTURE.md), [accepted decisions](./DECISIONS.md),
[operations](./OPERATIONS.md), the [security test plan](./SECURITY-TEST-PLAN.md),
[issue #68 proof](./proof/issue-68/README.md), and
[issue #70 follow-up proof](./proof/issue-70/README.md). The review-time sharing
acceptance proof is recorded under [issue #76 proof](./proof/issue-76/README.md).

## Scope boundaries

The feature does not add buyer lead capture, contacts/CRM, receipts/cookies,
agents, teams, assignment, delegated bookings, rotation/revocation/expiry,
public downloads, public invoices, unique-visitor measurement, daily analytics,
referral attribution, or third-party analytics. It does not add
`/dashboard/properties` or change authenticated delivery-file behavior.
