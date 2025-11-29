import { getPricingConfig } from "./actions";
import PricingEditor from "./PricingEditor";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const res = await getPricingConfig();
  const config = res.success ? res.data : {};

  return <PricingEditor initialConfig={config} />;
}
