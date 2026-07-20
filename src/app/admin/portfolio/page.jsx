import { redirect } from "next/navigation";
import {
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
} from "@/components/admin/AdminPrimitives";
import { getSessionUser } from "@/lib/helpers/auth";
import { listAdminPortfolioItems } from "@/lib/services/adminContent";
import PortfolioList from "./PortfolioList";

async function getPortfolioItems() {
  try {
    return {
      items: await listAdminPortfolioItems(),
      error: null,
    };
  } catch (error) {
    console.error("Error fetching portfolio items:", error);
    return {
      items: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch portfolio items",
    };
  }
}

export default async function PortfolioManagement() {
  const session = await getSessionUser();

  if (!session || session.role !== "SUPERADMIN") {
    redirect("/admin/login");
  }

  const { items, error } = await getPortfolioItems();

  return (
    <AdminPage>
      <AdminPageHeader eyebrow="Content" title="Portfolio" />

      {error ? (
        <AdminInlineMessage
          tone="danger"
          title="Unable to load every portfolio entry"
          description={error}
        />
      ) : null}

      <PortfolioList initialItems={items} loadError={error} />
    </AdminPage>
  );
}
