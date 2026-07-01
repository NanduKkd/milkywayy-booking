import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { deleteExpense, updateExpense } from "@/lib/services/expenseAdmin";

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

async function readOptionalJson(request) {
  const text = await request.text();

  if (!text) {
    return {};
  }

  return JSON.parse(text);
}

function getErrorStatus(error) {
  if (error.message === "Expense not found") {
    return 404;
  }

  if (
    error.message.includes("Expense ") ||
    error.message.includes("Delete reason")
  ) {
    return 400;
  }

  return 500;
}

export async function PUT(request, { params }) {
  try {
    const authorization = await requireExpenseAdminActor();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await params;
    const body = await request.json();
    const expense = await updateExpense({
      actorUser: authorization.actorUser,
      expenseId: id,
      input: body,
      reason: body?.reason ?? null,
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error updating admin expense:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update expense" },
      { status: getErrorStatus(error) },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authorization = await requireExpenseAdminActor();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await params;
    const body = await readOptionalJson(request);
    const expense = await deleteExpense({
      actorUser: authorization.actorUser,
      expenseId: id,
      reason: body?.reason,
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error deleting admin expense:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete expense" },
      { status: getErrorStatus(error) },
    );
  }
}
