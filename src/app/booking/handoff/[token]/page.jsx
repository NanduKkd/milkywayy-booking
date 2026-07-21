import { getPricingConfig } from "@/lib/helpers/pricing";
import BookingHandoffPageClient from "./BookingHandoffPageClient";

export const dynamic = "force-dynamic";

export default async function BookingHandoffPage({ params }) {
  const [resolvedParams, pricingConfig] = await Promise.all([
    params,
    getPricingConfig(),
  ]);

  return (
    <BookingHandoffPageClient
      token={resolvedParams.token}
      pricingConfig={pricingConfig}
    />
  );
}
