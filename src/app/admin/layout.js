import AdminHeader from "@/components/AdminHeader";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";

export const metadata = {
  title: "Admin Panel",
};

export default function AdminLayout({ children }) {
  return (
    <div className="admin-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px]">
        <aside className="hidden w-72 shrink-0 p-5 lg:block xl:w-80">
          <div className="admin-panel sticky top-5 rounded-[1.9rem] px-5 py-6">
            <p className="admin-kicker mb-4">Admin Portal</p>
            <AdminSidebarNav />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />
          <div className="px-4 py-4 lg:hidden">
            <AdminSidebarNav mobile />
          </div>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
