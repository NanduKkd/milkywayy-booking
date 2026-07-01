import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/helpers/auth";
import FinancialReportsPage from "./FinancialReportsPage";

export default async function AdminAnalyticsPage() {
  const session = await getSessionUser();

  if (!session || session.role !== "SUPERADMIN") {
    redirect("/admin/login");
  }

  return <FinancialReportsPage />;
}
