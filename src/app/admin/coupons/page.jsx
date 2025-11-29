import { getCoupons } from "@/lib/actions/coupons";
import CouponManager from "./CouponManager";

export default async function CouponsPage() {
  const coupons = await getCoupons();

  return (
    <div className="p-8 min-h-screen bg-[#121212]">
      <div className="max-w-6xl mx-auto">
        <CouponManager initialCoupons={coupons} />
      </div>
    </div>
  );
}
