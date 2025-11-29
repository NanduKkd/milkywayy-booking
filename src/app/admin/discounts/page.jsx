import { getDiscounts } from "@/lib/actions/discounts";
import DiscountManager from "./DiscountManager";

export default async function DiscountsPage() {
  const res = await getDiscounts();
  const discounts = res.success ? res.data : [];

  return (
    <div className="p-8 min-h-screen bg-[#121212]">
      <div className="max-w-6xl mx-auto">
        <DiscountManager initialDiscounts={discounts} />
      </div>
    </div>
  );
}
