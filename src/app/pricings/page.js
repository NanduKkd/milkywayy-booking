"use server";

import { Suspense } from "react";
import PricingPage from "./pricings";
// import { getPricings } from '@/lib/actions/dynamicConfig';

export default async function Page() {
  const sectionsPromise = Promise.resolve([]); // getPricings()
  return (
    <Suspense fallback={<div className="">Loading...</div>}>
      <PricingPage existingsPromise={sectionsPromise} />
    </Suspense>
  );
}
