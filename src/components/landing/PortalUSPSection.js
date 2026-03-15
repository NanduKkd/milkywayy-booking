import {
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  FolderDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PortalUSPSection = () => {
  const features = [
    { icon: Calendar, text: "Instant booking & scheduling" },
    { icon: DollarSign, text: "Transparent pricing" },
    {
      icon: FolderDown,
      text: "Files stored permanently (photo / video / 360)",
    },
    { icon: FileText, text: "Invoices downloadable anytime" },
    {
      icon: CheckCircle2,
      text: "Clear status tracking (Booked -> Scheduled -> Delivered)",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] via-transparent to-transparent" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="relative fade-in order-2 lg:order-1">
            <div className="absolute inset-0 bg-accent/10 blur-2xl rounded-3xl" />
            <div className="relative bg-card/80 border border-border rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex border-b border-border">
                {["Bookings", "Files", "Invoices"].map((tab, i) => (
                  <button
                    type="button"
                    key={tab}
                    className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-medium ${
                      i === 0
                        ? "bg-secondary/50 border-b-2 border-accent"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/60">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-muted-foreground">UPCOMING</span>
                    <span className="text-muted-foreground">
                      Tomorrow 10:00 AM
                    </span>
                  </div>
                  <p className="text-sm md:text-base font-semibold mb-1">
                    Marina Tower - Unit 2304
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Photography + Video
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-[11px] md:text-xs rounded-lg"
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-[11px] md:text-xs rounded-lg text-destructive"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="bg-secondary/20 rounded-xl p-4 border border-border/60">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-muted-foreground">DELIVERED</span>
                    <span className="text-muted-foreground">Dec 10, 2024</span>
                  </div>
                  <p className="text-sm md:text-base font-semibold mb-1">
                    Palm Jumeirah Villa
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    45 photos ready
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 h-9 text-[11px] md:text-xs rounded-lg bg-white/20 text-white hover:bg-white/30"
                  >
                    Download Files
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="fade-in order-1 lg:order-2 lg:max-w-[34rem]"
            style={{ animationDelay: "0.1s" }}
          >
            <h2 className="font-heading text-[2rem] md:text-[2.4rem] lg:text-[2.85rem] font-semibold leading-[1.02] tracking-tight mb-4">
              Everything in one Dashboard
            </h2>
            <p className="max-w-[32rem] text-sm md:text-[15px] leading-6 text-muted-foreground mb-5">
              One place to manage bookings, payments, files, and delivery updates without chasing messages or links.
            </p>
            <ul className="space-y-2.5 mb-6">
              {features.map((feature) => (
                <li
                  key={feature.text}
                  className="flex items-center gap-3 text-[15px] md:text-[1.02rem] font-medium tracking-[-0.02em] text-foreground/92"
                >
                  <div className="w-10 h-10 rounded-[1.15rem] bg-white/[0.045] flex items-center justify-center shrink-0 border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <feature.icon className="w-4 h-4 text-white/72" />
                  </div>
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <Link href="/booking">
              <Button
                size="lg"
                className="h-10 bg-accent text-sm text-accent-foreground hover:bg-accent/90 rounded-xl px-7"
              >
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
