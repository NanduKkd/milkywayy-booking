import { getWalletData } from "@/lib/actions/wallet";
import WalletView from "./WalletView";
import { redirect } from "next/navigation";
import { auth } from "@/lib/helpers/auth";

export default async function WalletPage() {
  const session = await auth();
  if (!session) redirect("/");

  const res = await getWalletData();
  const data = res.success ? res.data : { balance: 0, transactions: [] };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <WalletView data={data} />
      </div>
    </div>
  );
}
