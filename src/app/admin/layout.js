import AdminHeader from "@/components/AdminHeader";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";

export const metadata = {
  title: "Admin Panel",
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-card/60 p-5 lg:block">
          <div className="sticky top-5">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Admin Portal
            </p>
            <AdminSidebarNav />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />
          <div className="border-b border-white/10 px-4 py-3 lg:hidden">
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
