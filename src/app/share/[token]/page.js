import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolvePublicPropertyShareLanding,
  resolvePublicPropertyShareMetadata,
} from "@/lib/services/propertySharing";
import PropertyShowcase from "./PropertyShowcase";
import styles from "./showcase.module.css";

export const dynamic = "force-dynamic";
const genericMetadata = {
  title: "Property showcase | Milkywayy",
  description: "Explore this property showcase by Milkywayy.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

function mediaUrl(token, propertyId, mediaId) {
  return `/api/public/property-shares/${encodeURIComponent(token)}/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}`;
}

function previewUrl(token, propertyId, mediaId) {
  return `${mediaUrl(token, propertyId, mediaId)}/preview`;
}

function requestedPropertyId(searchParams) {
  const rawValue = Array.isArray(searchParams?.property)
    ? searchParams.property[0]
    : searchParams?.property;
  if (rawValue == null) return null;
  const value = Number(rawValue);
  return Number.isSafeInteger(value) && value > 0 ? value : Number.NaN;
}

function selectedProperty(landing, propertyId) {
  return landing.kind === "SINGLE_PROPERTY"
    ? landing.properties[0]
    : landing.properties.find((property) => property.id === propertyId);
}

function publicOrigin() {
  const configured = String(process.env.NEXT_PUBLIC_BASE_URL || "").trim();
  try {
    return new URL(configured || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

function publicPageUrl(token, landing, property) {
  const url = new URL(`/share/${encodeURIComponent(token)}`, publicOrigin());
  if (landing.kind === "MASTER" && property) {
    url.searchParams.set("property", String(property.id));
  }
  return url;
}

export async function generateMetadata({ params, searchParams }) {
  const { token } = await params;
  const query = await searchParams;
  const propertyId = requestedPropertyId(query);
  const landing = await resolvePublicPropertyShareMetadata(token, propertyId);
  if (!landing) return genericMetadata;

  const property = selectedProperty(landing, propertyId);
  if (!property) return genericMetadata;
  const firstImage = property.media.find((media) => media.kind === "IMAGE");
  if (!firstImage) return genericMetadata;

  const title = `${property.title} | Milkywayy`;
  const description =
    String(property.description || "").trim() ||
    `Explore ${property.title} on Milkywayy.`;
  const url = publicPageUrl(token, landing, property);
  const images = [
    {
      url: new URL(
        previewUrl(token, property.id, firstImage.id),
        publicOrigin(),
      ).toString(),
      type: "image/jpeg",
      width: 1200,
      height: 630,
      alt: property.title,
    },
  ];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Milkywayy",
      images,
    },
    robots: genericMetadata.robots,
    referrer: genericMetadata.referrer,
  };
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
  const propertyId = requestedPropertyId(query);
  const landing = await resolvePublicPropertyShareLanding(
    token,
    undefined,
    propertyId,
  );
  if (!landing) notFound();

  const property = selectedProperty(landing, propertyId);

  return (
    <main
      className={`public-share-root ${styles.root} ${
        property ? styles.showcaseRoot : styles.collectionRoot
      }`}
    >
      {landing.kind === "MASTER" && !property
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
            <footer className={`sp-footer ${styles.showcaseFooter}`}>
              Media &amp; page by <b>MILKYWAYY</b> · milkywayy.com
            </footer>
          </section>
        : property
          ? <>
              {landing.kind === "MASTER"
                ? <Link
                    href={`/share/${encodeURIComponent(token)}`}
                    className={styles.backLink}
                  >
                    <ArrowLeft aria-hidden="true" /> Back to the collection
                  </Link>
                : null}
              <PropertyShowcase property={property} token={token} />
            </>
          : notFound()}
    </main>
  );
}
