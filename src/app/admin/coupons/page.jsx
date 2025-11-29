import { getCoupons } from "@/lib/actions/coupons";
import CouponManager from "./CouponManager";

export default async function CouponsPage() {
  const res = await getCoupons();
  const coupons = res.success ? res.data : [];

  return (
    <div className="p-8 min-h-screen bg-[#121212]">
      <div className="max-w-6xl mx-auto">
        <CouponManager initialCoupons={coupons} />
      </div>
    </div>
  );
}
