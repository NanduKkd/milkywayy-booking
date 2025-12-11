import { Button } from "@/components/ui/button";
import {
  Calendar,
  Percent,
  Wallet,
  FolderDown,
  FileText,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

const PortalUSPSection = () => {
  const features = [
    { icon: Calendar, text: "Instant booking & scheduling" },
    { icon: Percent, text: "Discounts/coupons support" },
    { icon: Wallet, text: "Wallet cashback + transaction history" },
    { icon: FolderDown, text: "Files always available (photos/video/360)" },
    { icon: FileText, text: "Invoices downloadable anytime" },
    { icon: CheckCircle2, text: "Clear status tracking (Booked → Scheduled → Delivered)" },
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Dashboard Preview */}
          <div className="relative fade-in order-2 lg:order-1">
            <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-3xl" />
            <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
              {/* Dashboard tabs */}
              <div className="flex border-b border-border">
                {["Bookings", "Files", "Invoices", "Wallet"].map((tab, i) => (
                  <button
                    key={tab}
                    className={`flex-1 py-3 px-4 text-sm font-medium ${i === 0 ? "bg-secondary/50 border-b-2 border-accent" : "text-muted-foreground"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Dashboard content */}
              <div className="p-6 space-y-4">
                {/* Upcoming shoot */}
                <div className="bg-secondary/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-accent font-medium">UPCOMING</span>
                    <span className="text-xs text-muted-foreground">Tomorrow 10:00 AM</span>
                  </div>
                  <p className="font-medium mb-1">Marina Tower - Unit 2304</p>
                  <p className="text-sm text-muted-foreground">Photography + Video</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="text-xs">Reschedule</Button>
                    <Button size="sm" variant="outline" className="text-xs text-destructive">Cancel</Button>
                  </div>
                </div>

                {/* Completed shoot */}
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-accent font-medium">DELIVERED</span>
                    <span className="text-xs text-muted-foreground">Dec 10, 2024</span>
                  </div>
                  <p className="font-medium mb-1">Palm Jumeirah Villa</p>
                  <p className="text-sm text-muted-foreground">45 photos ready</p>
                  <Button size="sm" className="mt-3 bg-accent/20 text-accent hover:bg-accent/30 text-xs">
                    Download Files
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Features */}
          <div className="fade-in order-1 lg:order-2" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-8">
              Everything in one place — book, track, download.
            </h2>
            <ul className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-foreground">{feature.text}</span>
                </li>
              ))}
            </ul>
            <Link href="/booking">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse">
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PortalUSPSection;
