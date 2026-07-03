import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/helpers/auth";
import FinancialReportsPage from "./analytics/FinancialReportsPage";

export default async function AdminDashboard() {
  const session = await getSessionUser();

  if (!session || session.role !== "SUPERADMIN") {
    redirect("/admin/login");
  }

  return <FinancialReportsPage mode="dashboard" />;
}
