import { Button } from "@/components/ui/button";
import { Play, Clock, MapPin, Receipt, BadgeCheck } from "lucide-react";
import Link from "next/link";

const HeroSection = ({ onWatchVideo }) => {
  const trustChips = [
    { icon: Clock, text: "Photos in 24h*" },
    { icon: BadgeCheck, text: "From AED 350" },
    { icon: MapPin, text: "Dubai-wide" },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-background/5 backdrop-blur-[2px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8 fade-in">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Book property shoots in 60 seconds.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Dubai's first property shoot booking portal — book photography, video, and 360° tours instantly, then manage files & invoices from one dashboard.
            </p>

            {/* CTA Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/booking">
                <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse text-base px-8">
                  Book Now
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-border hover:bg-secondary"
                onClick={onWatchVideo}
              >
                <Play className="w-4 h-4 mr-2" />
                Watch How It Works
              </Button>
            </div>

            {/* Trust Chips */}
            <div className="flex flex-wrap gap-3">
              {trustChips.map((chip, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border border-border rounded-full text-sm"
                >
                  <chip.icon className="w-4 h-4 text-accent" />
                  <span>{chip.text}</span>
                </div>
              ))}
            </div>

            {/* Footnote */}
            <p className="text-xs text-muted-foreground">
              *Photos for any property are delivered within 24h.
            </p>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="relative fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              {/* Glow effect behind */}
              <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-3xl" />

              {/* Main preview container */}
              <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
                {/* Tab navigation */}
                <div className="flex border-b border-border">
                  <button className="flex-1 py-3 px-4 text-sm font-medium bg-secondary/50 border-b-2 border-accent">
                    Booking Flow
                  </button>
                  <button className="flex-1 py-3 px-4 text-sm font-medium text-muted-foreground">
                    Dashboard
                  </button>
                </div>

                {/* Booking flow preview */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-muted-foreground">Step 1 of 3</span>
                    <div className="flex gap-1">
                      <div className="w-8 h-1 bg-accent rounded" />
                      <div className="w-8 h-1 bg-border rounded" />
                      <div className="w-8 h-1 bg-border rounded" />
                    </div>
                  </div>

                  {/* Service selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Select Service</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["Photography", "Video", "360° Tour"].map((service, i) => (
                        <div
                          key={service}
                          className={`p-3 rounded-lg border text-center text-xs ${i === 0 ? "border-accent bg-accent/10" : "border-border"
                            }`}
                        >
                          {service}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Date picker placeholder */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Schedule</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-secondary rounded-lg text-xs text-center">
                        Dec 15, 2024
                      </div>
                      <div className="p-3 bg-secondary rounded-lg text-xs text-center">
                        10:00 AM
                      </div>
                    </div>
                  </div>

                  {/* Checkout button */}
                  <Button className="w-full bg-accent text-accent-foreground text-sm">
                    Continue to Checkout →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
