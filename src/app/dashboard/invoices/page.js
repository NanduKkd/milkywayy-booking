import { getInvoices } from "@/lib/actions/wallet";
import InvoiceList from "./InvoiceList";
import { redirect } from "next/navigation";
import { auth } from "@/lib/helpers/auth";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session) redirect("/");

  const res = await getInvoices();
  const invoices = res.success ? res.data : [];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <InvoiceList invoices={invoices} />
      </div>
    </div>
  );
}
