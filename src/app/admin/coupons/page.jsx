import { redirect } from "next/navigation";

export default async function CouponsPage() {
  redirect("/admin/promotions");
}
