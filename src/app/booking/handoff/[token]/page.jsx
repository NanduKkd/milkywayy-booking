import { getDiscounts } from "@/lib/actions/discounts";
import { getPricingConfig } from "@/lib/helpers/pricing";
import BookingHandoffPageClient from "./BookingHandoffPageClient";

export const dynamic = "force-dynamic";

export default async function BookingHandoffPage({ params }) {
  const [resolvedParams, pricingConfig, discountsResult] = await Promise.all([
    params,
    getPricingConfig(),
    getDiscounts(),
  ]);

  return (
    <BookingHandoffPageClient
      token={resolvedParams.token}
      pricingConfig={pricingConfig}
      discounts={discountsResult?.success ? discountsResult.data : []}
    />
  );
}
