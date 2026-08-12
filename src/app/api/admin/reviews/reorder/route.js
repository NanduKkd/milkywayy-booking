import { NextResponse } from "next/server";
import { sequelize } from "@/lib/db/db";
import Review from "@/lib/db/models/review";
import { requireSuperadminActor } from "@/lib/helpers/authorization";
import { authorizationErrorResponse } from "@/lib/helpers/routeAuthorization";

export async function PATCH(request) {
  try {
    await requireSuperadminActor();

    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Payload must be an array of objects with id and order" },
        { status: 400 },
      );
    }

    await sequelize.transaction(async (transaction) => {
      for (const item of body) {
        if (item.id !== undefined && item.order !== undefined) {
          await Review.update(
            { order: item.order },
            { where: { id: item.id }, transaction },
          );
        }
      }
    });

    return NextResponse.json({ message: "Review order updated successfully" });
  } catch (error) {
    const authorizationResponse = authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Error reordering reviews:", error);
    return NextResponse.json(
      { error: "Failed to reorder reviews" },
      { status: 500 },
    );
  }
}
