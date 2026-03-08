import NewNavbar from "@/components/NewNavbar";

export default function BookingLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="starfield" aria-hidden />
      <NewNavbar />
      <main className="pt-20 relative z-10">{children}</main>
    </div>
  );
}
