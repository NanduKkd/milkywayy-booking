import { Suspense } from "react";
import { getPricingConfig } from "@/app/admin/prices/actions";
import { getPublicLaunchPromo } from "@/lib/actions/coupons";
import { getDiscounts } from "@/lib/actions/discounts";
import BookNew from "./BookNew";
export const dynamic = "force-dynamic";

export default async function Booking() {
  const pricingsPromise = getPricingConfig();
  const discountsPromise = getDiscounts();
  const launchPromoRes = await getPublicLaunchPromo();
  const launchPromoAvailability = launchPromoRes?.success
    ? launchPromoRes.data
    : null;

  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-xl shimmer" />
            <p className="text-sm text-muted-foreground">Loading booking…</p>
          </div>
        </div>
      }
    >
      <BookNew
        pricingsPromise={pricingsPromise}
        discountsPromise={discountsPromise}
        launchPromoAvailability={launchPromoAvailability}
      />
    </Suspense>
  );
}
