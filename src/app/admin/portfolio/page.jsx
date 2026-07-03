import { redirect } from "next/navigation";
import {
  AdminBadge,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
} from "@/components/admin/AdminPrimitives";
import { getSessionUser } from "@/lib/helpers/auth";
import PortfolioList from "./PortfolioList";

async function getPortfolioItems() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/our-works`,
      {
        cache: "no-store",
      },
    );

    if (!res.ok) {
      let message = "Failed to fetch portfolio items";

      try {
        const payload = await res.json();
        if (payload?.error) {
          message = payload.error;
        }
      } catch {}

      throw new Error(message);
    }

    return {
      items: await res.json(),
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
    <AdminPage className="px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Content"
        title="Portfolio"
        description="Manage the live Our Works library shown across the landing page and portfolio surfaces. Filters, visibility changes, uploads, and drag ordering all stay on the current production data."
        actions={
          <AdminBadge tone="info">Global ordering stays live</AdminBadge>
        }
      />

      {error ? (
        <AdminInlineMessage
          tone="danger"
          title="Unable to load every portfolio entry"
          description={error}
        />
      ) : null}

      <PortfolioList initialItems={items} />
    </AdminPage>
  );
}
