import { ArrowLeft, Building2, Download, FolderLock } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getPublicPropertyManifest,
  resolvePublicPropertyShareLanding,
} from "@/lib/services/propertySharing";
import { getPropertyShareReceiptCookieName } from "@/lib/services/propertySharingSecurity";
import ContactGate from "./ContactGate";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Shared property | Milkywayy",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

function formatCompletedAt(value) {
  if (!value) return "Completed property";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Completed property";
  return `Completed ${new Intl.DateTimeFormat("en-AE", {
    timeZone: "Asia/Dubai",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

function PropertySummary({ property }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
        Shared property
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
        {property.title}
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        {formatCompletedAt(property.completedAt)}
        {property.services.length > 0
          ? ` · ${property.services.join(" · ")}`
          : ""}
      </p>
    </div>
  );
}

function SharedFiles({ token, propertyId, manifest }) {
  return (
    <section className="rounded-3xl border border-emerald-400/15 bg-[#111318]/95 p-6 md:p-8">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-emerald-400/10 p-2 text-emerald-300">
          <FolderLock className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">Shared files</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Each action is authorized for this property and exact delivered
            version.
          </p>
        </div>
      </div>
      <div className="mt-6 divide-y divide-white/10">
        {manifest.files.map((file) => (
          <div
            key={file.id}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-100">
                {file.filename}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {file.label || file.type}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a
                href={`/api/public/property-shares/${encodeURIComponent(token)}/properties/${encodeURIComponent(propertyId)}/files/${encodeURIComponent(file.id)}`}
                rel="noreferrer"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        ))}
      </div>
    </section>
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

  let manifest = null;
  if (selectedProperty) {
    const cookieStore = await cookies();
    const receiptToken = cookieStore.get(
      getPropertyShareReceiptCookieName(landing.id, selectedProperty.id),
    )?.value;
    if (receiptToken) {
      manifest = await getPublicPropertyManifest(
        token,
        selectedProperty.id,
        receiptToken,
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#08090c] px-5 py-10 text-white md:px-8 md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">
            Milkywayy
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
            Private shared delivery
          </span>
        </div>

        {landing.kind === "MASTER" && !selectedProperty
          ? <>
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                  Shared collection
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
                  Completed properties
                </h1>
                <p className="mt-4 text-zinc-400">
                  Choose a property. Name and phone access is granted separately
                  for each property you open.
                </p>
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {landing.properties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/share/${encodeURIComponent(token)}?property=${encodeURIComponent(property.id)}`}
                    className="group rounded-3xl border border-white/10 bg-[#111318] p-6 transition hover:border-sky-300/30 hover:bg-[#151820]"
                  >
                    <Building2 className="h-5 w-5 text-sky-300" />
                    <h2 className="mt-6 text-xl font-semibold text-white">
                      {property.title}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      {formatCompletedAt(property.completedAt)}
                    </p>
                    <p className="mt-6 text-sm font-medium text-sky-300">
                      Open property →
                    </p>
                  </Link>
                ))}
              </div>
            </>
          : selectedProperty
            ? <>
                {landing.kind === "MASTER"
                  ? <Link
                      href={`/share/${encodeURIComponent(token)}`}
                      className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      All shared properties
                    </Link>
                  : null}
                <PropertySummary property={selectedProperty} />
                <div className="mt-10 max-w-2xl">
                  {manifest
                    ? <SharedFiles
                        token={token}
                        propertyId={selectedProperty.id}
                        manifest={manifest}
                      />
                    : <ContactGate
                        token={token}
                        propertyId={selectedProperty.id}
                        propertyTitle={selectedProperty.title}
                      />}
                </div>
              </>
            : notFound()}
      </div>
    </main>
  );
}
