import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { createExpense, listExpenses } from "@/lib/services/expenseAdmin";

async function requireExpenseAdminActor() {
  const session = await auth();

  if (!session?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      actorUser: null,
    };
  }

  const user = await models.User.findByPk(session.id);

  if (!user || user.role !== USER_ROLES.SUPERADMIN) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      actorUser: null,
    };
  }

  return {
    error: null,
    actorUser: {
      id: Number(user.id),
      role: user.role,
    },
  };
}

export async function GET(request) {
  try {
    const authorization = await requireExpenseAdminActor();

    if (authorization.error) {
      return authorization.error;
    }

    const url = new URL(request.url);
    const filters = Object.fromEntries(
      ["rangeStart", "rangeEnd", "category", "includeDeleted"]
        .filter((key) => url.searchParams.has(key))
        .map((key) => [key, url.searchParams.get(key)]),
    );
    const result = await listExpenses({
      actorUser: authorization.actorUser,
      filters,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error loading admin expenses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load expenses" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const authorization = await requireExpenseAdminActor();

    if (authorization.error) {
      return authorization.error;
    }

    const body = await request.json();
    const expense = await createExpense({
      actorUser: authorization.actorUser,
      input: body,
      reason: body?.reason ?? null,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    const status =
      error.message === "Expense input must be an object" ||
      error.message.includes("Expense ") ||
      error.message.includes("Delete reason")
        ? 400
        : 500;

    console.error("Error creating admin expense:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create expense" },
      { status },
    );
  }
}
