import { redirect } from "next/navigation";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPrimitives";
import UserTable from "@/components/UserTable";
import models from "@/lib/db/models";
import { getSessionUser } from "@/lib/helpers/auth";

async function getUsers(page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;

    const { count, rows: users } = await models.User.findAndCountAll({
      attributes: [
        "id",
        "fullName",
        "email",
        "phone",
        "role",
        "disabledAt",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return {
      users: users.map((user) => user.toJSON()),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      users: [],
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export default async function UserManagement({ searchParams }) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/admin/login");
    return null;
  }

  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams?.page, 10) || 1;
  const limit = parseInt(resolvedSearchParams?.limit, 10) || 10;

  const { users, pagination } = await getUsers(page, limit);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Workspace / Customers"
        title="Customers"
        description="Review the live account directory, keep customer contact details visible, and preserve the current internal-role workflows on `/admin/users`."
      />

      <UserTable users={users} pagination={pagination} />
    </AdminPage>
  );
}
