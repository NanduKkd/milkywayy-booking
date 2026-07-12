import { redirect } from "next/navigation";
import {
  AdminBadge,
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminPage,
  AdminPageHeader,
} from "@/components/admin/AdminPrimitives";
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
  const visibleStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const visibleEnd =
    pagination.total === 0 ? 0 : visibleStart + Math.max(users.length - 1, 0);
  const visibleStaffAccounts = users.filter(
    (user) => user.role && user.role !== "CUSTOMER",
  ).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Workspace / Customers"
        title="Customers"
        description="Review the live account directory, keep customer contact details visible, and preserve the current internal-role workflows on `/admin/users`."
      >
        <div className="flex flex-wrap gap-3">
          <AdminBadge tone="info">Live directory</AdminBadge>
          <AdminBadge tone="neutral">Route preserved</AdminBadge>
        </div>
      </AdminPageHeader>

      <section className="grid gap-4 md:grid-cols-3">
        <AdminCard tone="subtle">
          <AdminCardHeader>
            <AdminCardDescription>Total records</AdminCardDescription>
            <AdminCardTitle className="text-3xl">
              {pagination.total}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <p className="text-sm text-[hsl(var(--admin-muted))]">
              All accounts currently returned by the live `/admin/users` route.
            </p>
          </AdminCardContent>
        </AdminCard>
        <AdminCard tone="subtle">
          <AdminCardHeader>
            <AdminCardDescription>Visible now</AdminCardDescription>
            <AdminCardTitle className="text-3xl">
              {visibleStart}-{visibleEnd}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <p className="text-sm text-[hsl(var(--admin-muted))]">
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} at{" "}
              {pagination.limit} records per page.
            </p>
          </AdminCardContent>
        </AdminCard>
        <AdminCard tone="subtle">
          <AdminCardHeader>
            <AdminCardDescription>Staff roles in view</AdminCardDescription>
            <AdminCardTitle className="text-3xl">
              {visibleStaffAccounts}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <p className="text-sm text-[hsl(var(--admin-muted))]">
              Current page rows that still carry internal workflow roles.
            </p>
          </AdminCardContent>
        </AdminCard>
      </section>

      <UserTable users={users} pagination={pagination} />
    </AdminPage>
  );
}
