import { redirect } from "next/navigation";

export default async function DiscountsPage() {
  redirect("/admin/promotions");
}
