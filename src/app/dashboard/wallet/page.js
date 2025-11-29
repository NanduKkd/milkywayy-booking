import { getWalletData } from "@/lib/actions/wallet";
import WalletView from "./WalletView";
import { redirect } from "next/navigation";
import { auth } from "@/lib/helpers/auth";

export default async function WalletPage() {
  const session = await auth();
  if (!session) redirect("/");

  const data = await getWalletData();

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          My Wallet
        </h1>
        <WalletView data={data} />
      </div>
    </div>
  );
}
