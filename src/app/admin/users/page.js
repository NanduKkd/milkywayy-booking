import { getSessionUser } from "@/lib/helpers/auth";
import { redirect } from "next/navigation";
import UserTable from "@/components/UserTable";
import { sequelize } from "@/lib/db";
import models from "@/lib/db/models";

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
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return {
      users: users.map((i) => i.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      users: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
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
  }

  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams?.page) || 1;
  const limit = parseInt(resolvedSearchParams?.limit) || 10;

  const { users, pagination } = await getUsers(page, limit);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-600 mt-2">
          Manage and view all users in system
        </p>
      </div>

      <UserTable users={users} pagination={pagination} />
    </div>
  );
}
