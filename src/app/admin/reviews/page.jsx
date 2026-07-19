import { redirect } from "next/navigation";
import {
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/helpers/auth";
import ReviewList from "./ReviewList";

async function getReviews() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/admin/reviews`,
      {
        cache: "no-store",
      },
    );

    if (!res.ok) {
      let message = "Failed to fetch reviews";

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
    console.error("Error fetching reviews:", error);
    return {
      items: [],
      error: error instanceof Error ? error.message : "Failed to fetch reviews",
    };
  }
}

export default async function ReviewsManagement() {
  const session = await getSessionUser();

  if (!session || session.role !== "SUPERADMIN") {
    redirect("/admin/login");
  }

  const { items, error } = await getReviews();

  return (
    <AdminPage>
      <AdminPageHeader eyebrow="Content" title="Reviews" />

      {error ? (
        <div className="space-y-4">
          <AdminInlineMessage
            tone="danger"
            title="Reviews are unavailable"
            description={`The review totals and testimonial lists could not be loaded. ${error}`}
          />
          <Button asChild variant="outline" className="w-fit">
            <a href="/admin/reviews">Try again</a>
          </Button>
        </div>
      ) : (
        <ReviewList initialItems={items} />
      )}
    </AdminPage>
  );
}
