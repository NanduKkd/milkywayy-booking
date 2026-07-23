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
no separate Video Walkthrough button.

The single-property showcase owns the full browser surface. It has no outer
card border, radius, shadow, or page gutter; the media and listing split fill
the viewport on desktop and become an edge-to-edge single column on narrow
screens. If an authorized media object is missing, both the hero and its
thumbnail show an explicit unavailable state rather than a broken image.

Property sharing no longer repeats delivered projects in a standalone
management section. Each eligible completed project card in the authenticated
`FileList` contains its contextual **Create Share Link** action. After
publication that action becomes **Manage Share Link**, opening the stable copy,
preview, edit, and disable/enable controls for that property. The compact
reference-style listing form opens directly from the card, and Preview embeds
the actual public buyer page with Phone and Desktop widths.

Existing master-link data and public collection routes remain readable, but the
removed standalone section is no longer a customer entry point for creating or
editing a master collection.

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
and [issue #68 proof](./proof/issue-68/README.md).

## Scope boundaries

The feature does not add buyer lead capture, contacts/CRM, receipts/cookies,
agents, teams, assignment, delegated bookings, rotation/revocation/expiry,
public downloads, public invoices, unique-visitor measurement, daily analytics,
referral attribution, or third-party analytics. It does not add
`/dashboard/properties` or change authenticated delivery-file behavior.
