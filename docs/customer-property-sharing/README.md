# Customer property showcases

The customer dashboard exposes property-showcase management inside the existing
`/dashboard/files` route. The visible tab and page language say **Properties**,
while `fileId` deep links, authenticated downloads, copy-link delivery,
revisions, replacement states, review deadlines, completion controls, and the
full existing `FileList` retain their authenticated contracts.

An authenticated property owner or real-estate agent can configure one public
listing per owned completed booking. Configuration includes listing title, AED
price, listing type, bathrooms, square-foot size, furnishing, description,
highlights/amenities, contact name, and contact phone. Contact fields are
owner-authored listing content; buyers never submit contact data and the feature
does not create an agent, team, assignment, or visitor-contact model.

The owner can publish:

- one stable single-property public link for each configured eligible property;
- one stable master public link containing at least two explicitly selected
  configured properties.

A public single link opens a responsive buyer-facing showcase immediately. A
master link opens a curated collection; selecting a card opens the complete
showcase under the same bearer. Showcases include real accepted photo/video/360
media, listing metadata, description, highlights, telephone and WhatsApp
actions, and Milkywayy branding. They contain no buyer form, delivery manifest,
download button, revision control, or authenticated file route.

Accepted 360 copy-link deliveries appear in the main media viewer as lazy
iframes, using the same interactive presentation as the landing-page portfolio.
They are selected from a text/icon media tile beside the photo and video items,
without an image thumbnail. Video remains selectable in the media strip and has
no separate Video Walkthrough button. The hero retains only its media-position
count and does not show a media-type badge.

The single-property showcase owns the full browser surface. It has no outer
card border, radius, shadow, or page gutter; the media and listing split fill
the viewport on desktop, the media hero stretches through the available
viewport height above its thumbnail strip, and photos/videos use contain sizing
without cropping. The layout becomes an edge-to-edge single column on narrow
screens. If an authorized media object is missing, both the hero and its
thumbnail show an explicit unavailable state rather than a broken image.

The management UI follows the supplied reference with compact **Shared
Properties**, **Master Links**, and select-multiple/action-bar surfaces, a
compact listing form, and card-click preview. Eligible unshared completed
projects expose **Create Share Link** in the authenticated `FileList` directly
below the manager; published properties are managed above it. Owners select two
or more shared property cards—including the visible check control—to create or
update the master collection. Preview embeds the actual public buyer page and
can be switched between Phone and Desktop widths.

The existing authenticated `FileList` remains directly below the sharing
manager with its download, revision, replacement, review, and completion
behavior unchanged.

After the owner creates a share from a Delivered files card, the refreshed
server result is reconciled into both authenticated surfaces: the create action
disappears and the new listing appears in **Shared Properties** immediately,
without a manual browser refresh.

Each valid property showcase publishes listing-specific browser and Open Graph
metadata. The page title and Open Graph title use
`<listing title> | Milkywayy`, the description uses the owner-authored listing
description, the URL identifies the represented share page, and the preview
image is the first ordered public image through the existing token-scoped
inline media route. Invalid or unavailable links retain generic metadata.

The public master collection fills the browser bounds without an outer card
margin, border, radius, or shadow. It does not repeat a collection-level contact
card: contact and WhatsApp actions remain available inside each selected
property's full showcase. The selected-property view keeps an inset,
keyboard-focusable back-to-collection link above the showcase.

Public pages always resolve the current accepted browser-safe media for the
selected booking. Photos and videos are streamed only through
link/property/file-scoped inline routes, and persisted private object URLs are
never serialized. Validated HTTPS 360 tour links are intentionally exposed as
iframe sources with a no-referrer policy; they never pass through the owned
object route.

The public identifier is a stable, opaque 256-bit value. A link is deliberately
public and reshareable. The owner can copy it after any reload and can disable
or re-enable it; there is no rotate, revoke, refresh-snapshot, expiry, or
one-time-copy lifecycle. The dashboard shows only a total link-view count.
There is no raw view event or visitor-identity store.

Continue with [architecture](./ARCHITECTURE.md), [accepted decisions](./DECISIONS.md),
[operations](./OPERATIONS.md), the [security test plan](./SECURITY-TEST-PLAN.md),
[issue #68 proof](./proof/issue-68/README.md), and
[issue #70 follow-up proof](./proof/issue-70/README.md).

## Scope boundaries

The feature does not add buyer lead capture, contacts/CRM, receipts/cookies,
agents, teams, assignment, delegated bookings, rotation/revocation/expiry,
public downloads, public invoices, unique-visitor measurement, daily analytics,
referral attribution, or third-party analytics. It does not add
`/dashboard/properties` or change authenticated delivery-file behavior.
