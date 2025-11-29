import CustomerHeader from "@/components/CustomerHeader";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-black">
      <CustomerHeader />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
