import { getPricingConfig } from "./actions";
import PricingEditor from "./PricingEditor";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const res = await getPricingConfig();
  const config = res.success ? res.data : {};
  const loadError = res.success ? null : res.message;

  return <PricingEditor initialConfig={config} loadError={loadError} />;
}
