import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePublicPropertyShareLanding } from "@/lib/services/propertySharing";
import PropertyShowcase from "./PropertyShowcase";
import styles from "./showcase.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Property showcase | Milkywayy",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

function mediaUrl(token, propertyId, mediaId) {
  return `/api/public/property-shares/${encodeURIComponent(token)}/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}`;
}

function ContactCard({ contact, compact = false }) {
  const initials = contact.name
    .split(/\s+/u)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`contact-card ${styles.contactCard} ${compact ? styles.compactContact : ""}`}
    >
      <div className={`avatar ${styles.avatar}`} aria-hidden="true">
        {initials}
      </div>
      <div className={styles.contactMeta}>
        <div className={styles.contactName}>{contact.name}</div>
        <a className={styles.contactPhone} href={contact.telephoneUrl}>
          {contact.phone}
        </a>
      </div>
      <a
        className={`wa-btn ${styles.whatsappButton}`}
        href={contact.whatsappUrl}
        rel="noreferrer"
        target="_blank"
      >
        WhatsApp
      </a>
    </div>
  );
}

function CollectionCard({ token, property }) {
  const hero = property.media.find((media) =>
    media.mimeType.startsWith("image/"),
  );
  return (
    <Link
      className={`cmini ${styles.collectionCard}`}
      href={`/share/${encodeURIComponent(token)}?property=${encodeURIComponent(property.id)}`}
    >
      <div className={`cmini-img ${styles.collectionImage}`}>
        {hero
          ? // The token-scoped route streams this pinned accepted media inline.
            <Image
              alt=""
              fill
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              unoptimized
              src={mediaUrl(token, property.id, hero.id)}
            />
          : <div className={styles.mediaFallback}>Media preview</div>}
      </div>
      <div className={`cmini-body ${styles.collectionBody}`}>
        <div className={`cmini-price ${styles.collectionPrice}`}>
          {property.displayPrice}
        </div>
        <div className={`cmini-name ${styles.collectionName}`}>
          {property.title}
          {property.location ? ` · ${property.location}` : ""}
        </div>
        <div className={`sp-chips ${styles.chips} ${styles.collectionChips}`}>
          {property.bedrooms !== null
            ? <span className={`chip ${styles.chip}`}>
                {property.bedrooms} Bed
              </span>
            : null}
          {property.bathrooms !== null
            ? <span className={`chip ${styles.chip}`}>
                {property.bathrooms} Bath
              </span>
            : null}
          {property.sizeSqft
            ? <span className={`chip ${styles.chip}`}>
                {property.sizeSqft.toLocaleString("en-AE")} sqft
              </span>
            : null}
        </div>
      </div>
    </Link>
  );
}

export default async function SharedPropertyPage({ params, searchParams }) {
  const { token } = await params;
  const query = await searchParams;
  const rawRequestedPropertyId = Array.isArray(query?.property)
    ? query.property[0]
    : query?.property;
  const requestedPropertyId =
    rawRequestedPropertyId == null ? null : Number(rawRequestedPropertyId);
  const landing = await resolvePublicPropertyShareLanding(
    token,
    undefined,
    requestedPropertyId,
  );
  if (!landing) notFound();

  const selectedProperty =
    landing.kind === "SINGLE_PROPERTY"
      ? landing.properties[0]
      : landing.properties.find(
          (property) => property.id === requestedPropertyId,
        );

  return (
    <main
      className={`public-share-root ${styles.root} ${
        selectedProperty ? styles.showcaseRoot : styles.collectionRoot
      }`}
    >
      {landing.kind === "MASTER" && !selectedProperty
        ? <section className={`collection ${styles.collection}`}>
            <div className={`col-pad ${styles.collectionHeading}`}>
              <h1 className={`col-head-m ${styles.collectionTitle}`}>
                {landing.properties.length} homes picked for you
              </h1>
              <p className={`col-sub-m ${styles.collectionSubtitle}`}>
                Curated by {landing.properties[0].contact.name}
              </p>
            </div>
            <div className={`col-grid-d ${styles.collectionGrid}`}>
              {landing.properties.map((property) => (
                <CollectionCard
                  key={property.id}
                  token={token}
                  property={property}
                />
              ))}
            </div>
            <div className={styles.collectionContact}>
              <ContactCard contact={landing.properties[0].contact} compact />
            </div>
            <footer className={`sp-footer ${styles.showcaseFooter}`}>
              Media &amp; page by <b>MILKYWAYY</b> · milkywayy.com
            </footer>
          </section>
        : selectedProperty
          ? <>
              {landing.kind === "MASTER"
                ? <Link
                    href={`/share/${encodeURIComponent(token)}`}
                    className={styles.backLink}
                  >
                    <ArrowLeft aria-hidden="true" /> Back to the collection
                  </Link>
                : null}
              <PropertyShowcase property={selectedProperty} token={token} />
            </>
          : notFound()}
    </main>
  );
}
