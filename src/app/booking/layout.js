import NewNavbar from "@/components/NewNavbar";

export default function BookingLayout({ children }) {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="starfield" />
      <NewNavbar />
      <main className="pt-20">{children}</main>
    </div>
  );
}
