import AdminHeader from "@/components/AdminHeader";

export const metadata = {
  title: "Admin Panel",
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main>{children}</main>
    </div>
  );
}
