import { redirect } from "next/navigation";
import { getInvoices } from "@/lib/actions/wallet";
import { auth } from "@/lib/helpers/auth";
import InvoiceList from "./InvoiceList";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session) redirect("/");

  const res = await getInvoices();
  const invoices = res.success ? res.data : [];

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        <InvoiceList invoices={invoices} />
      </div>
    </div>
  );
}
