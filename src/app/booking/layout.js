import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";

export default function BookingLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="starfield" aria-hidden />
      <NewNavbar />
      <main className="relative z-10">{children}</main>
      <Footer />
      <div className="h-20 lg:h-0" />
    </div>
  );
}
