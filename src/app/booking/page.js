import { Suspense } from "react";
import { getPricingConfig } from "@/app/admin/prices/actions";
import { getDiscounts } from "@/lib/actions/discounts";
// import BookingPortal from "./BookingPortal";
import BookNew from "./BookNew";
export const dynamic = "force-dynamic";

export default async function Booking() {
  const pricingsPromise = getPricingConfig();
  const discountsPromise = getDiscounts();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-foreground">Loading...</div>
        </div>
      }
    >
      <BookNew
        // BookingPortal
        pricingsPromise={pricingsPromise}
        discountsPromise={discountsPromise}
      />
    </Suspense>
  );
}
