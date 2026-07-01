import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/helpers/auth";
import SchedulingCalendarPage from "./SchedulingCalendarPage";

export default async function AdminSchedulingCalendarRoute() {
  const session = await getSessionUser();

  if (!session || session.role !== "SUPERADMIN") {
    redirect("/admin/login");
  }

  return <SchedulingCalendarPage />;
}
