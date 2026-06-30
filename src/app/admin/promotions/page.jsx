import { getPromotionsAdminData } from "@/lib/actions/promotions";
import PromotionManager from "./PromotionManager";

export default async function PromotionsPage() {
  const res = await getPromotionsAdminData();
  const promotions = res.success ? res.data.promotions : [];
  const loadError = res.success ? null : res.message;

  return (
    <PromotionManager initialPromotions={promotions} loadError={loadError} />
  );
}
