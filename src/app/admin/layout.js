import AdminHeader from "@/components/AdminHeader";
import AdminSidebarShell from "@/components/admin/AdminSidebarShell";

export const metadata = {
  title: "Admin Panel",
};

export default function AdminLayout({ children }) {
  return (
    <div className="admin-shell flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 border-r border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] lg:block">
        <AdminSidebarShell />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
