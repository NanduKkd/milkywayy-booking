import { Suspense } from "react";
import BookNew from "./BookNew";
import { getPricingConfig } from "@/app/admin/prices/actions";
import { getDiscounts } from "@/lib/actions/discounts";

export default async function Booking() {
  const pricingsPromise = getPricingConfig();
  const discountsPromise = getDiscounts();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <BookNew
        bookingsPromise={Promise.resolve([])}
        pricingsPromise={pricingsPromise}
        discountsPromise={discountsPromise}
      />
    </Suspense>
  );
}
