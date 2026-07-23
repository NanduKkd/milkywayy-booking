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

The management UI follows the supplied reference: compact Ready to Share,
Shared Properties, Master Links, and select-multiple/action-bar surfaces; a
compact listing form; and card-click preview. Preview embeds the actual public
buyer page and can be switched between Phone and Desktop widths.

Public pages always resolve the current accepted browser-safe media for the
selected booking. Media is streamed only through link/property/file-scoped
inline routes, and persisted private object URLs are never serialized.

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
