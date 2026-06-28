import { redirect } from "next/navigation";
import DashboardAccessGate from "@/components/DashboardAccessGate";
import { auth } from "@/lib/helpers/auth";
import { normalizeDashboardNext } from "@/lib/helpers/dashboardAuth";

export default async function DashboardPage({ searchParams }) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeDashboardNext(resolvedSearchParams?.next);

  if (session) {
    redirect(nextPath);
  }

  return <DashboardAccessGate nextPath={nextPath} />;
}
