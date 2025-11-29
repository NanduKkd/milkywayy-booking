import { getPricingConfig } from "./actions";
import PricingEditor from "./PricingEditor";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const config = await getPricingConfig();

  return <PricingEditor initialConfig={config} />;
}
