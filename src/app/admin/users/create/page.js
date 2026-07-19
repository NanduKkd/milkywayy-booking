"use client";

import { useRouter } from "next/navigation";
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
import CreateUserForm from "@/components/CreateUserForm";

export default function CreateUserPage() {
  const router = useRouter();

  const handleSubmit = (userData) => {
    console.log("Creating user:", userData);
    router.push("/admin/users");
  };

  const handleCancel = () => {
    router.push("/admin/users");
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Workspace / Customers"
        title="Create account"
        description="Add a new internal account without changing the existing `/admin/users` creation flow."
      >
        <div className="flex flex-wrap gap-3">
          <AdminBadge tone="warning">Internal roles only</AdminBadge>
        </div>
      </AdminPageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>New directory entry</AdminCardTitle>
            <AdminCardDescription>
              Fill in the current account fields and keep role assignment
              aligned with the workflow the user needs to access.
            </AdminCardDescription>
          </AdminCardHeader>
          <AdminCardContent>
            <CreateUserForm onSubmit={handleSubmit} onCancel={handleCancel} />
          </AdminCardContent>
        </AdminCard>

        <AdminCard tone="subtle">
          <AdminCardHeader>
            <AdminCardTitle>Available roles</AdminCardTitle>
            <AdminCardDescription>
              This page preserves the existing account model instead of
              introducing a customer-only create flow.
            </AdminCardDescription>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-sm font-medium text-[hsl(var(--admin-foreground))]">
                Super Admin
              </p>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--admin-muted))]">
                Full access to the current admin surface and shared operational
                controls.
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-sm font-medium text-[hsl(var(--admin-foreground))]">
                Transport
              </p>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--admin-muted))]">
                Preserves the existing logistics-focused role assignment used by
                current operations.
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-sm font-medium text-[hsl(var(--admin-foreground))]">
                Shoot
              </p>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--admin-muted))]">
                Keeps the current production-oriented account type available
                from the same admin workflow.
              </p>
            </div>
          </AdminCardContent>
        </AdminCard>
      </div>
    </AdminPage>
  );
}
