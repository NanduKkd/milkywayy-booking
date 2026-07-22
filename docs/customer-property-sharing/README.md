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

- one live single-property bearer link for each configured eligible property;
- one live master bearer link containing at least two explicitly selected
  configured properties.

A public single link opens a responsive buyer-facing showcase immediately. A
master link opens a curated collection; selecting a card opens the complete
showcase under the same bearer. Showcases include real accepted photo/video/360
media, listing metadata, description, highlights, telephone and WhatsApp
actions, and Milkywayy branding. They contain no buyer form, delivery manifest,
download button, revision control, or authenticated file route.

Media membership pins exact accepted current delivery-file versions when a link
is created, a master selection is updated, or the owner explicitly refreshes
the snapshot. Public media is streamed only through token/property/membership
scoped inline routes. Persisted private object URLs are never serialized.

Owners can disable/re-enable, refresh media, rotate the bearer, permanently
revoke, and inspect aggregate total/last-viewed/Dubai-day request views. There
is no raw view event or visitor-identity store.

Continue with [architecture](./ARCHITECTURE.md), [accepted decisions](./DECISIONS.md),
[operations](./OPERATIONS.md), the [security test plan](./SECURITY-TEST-PLAN.md),
and [issue #68 proof](./proof/issue-68/README.md).

## Scope boundaries

The feature does not add buyer lead capture, contacts/CRM, receipts/cookies,
agents, teams, assignment, delegated bookings, public downloads, public
invoices, unique-visitor measurement, referral attribution, or third-party
analytics. It does not add `/dashboard/properties` or change authenticated
delivery-file behavior.
