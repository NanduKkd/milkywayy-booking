import { Button } from "@/components/ui/button";
import { Play, Clock, MapPin, BadgeCheck, Building2, Home, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const HeroSection = ({ onWatchVideo }) => {
  const [activePropertyType, setActivePropertyType] = useState("apartment");
  const [activeService, setActiveService] = useState(0);

  const trustChips = [
    { icon: Clock, text: "Photos in 24h*" },
    { icon: BadgeCheck, text: "From AED 350" },
    { icon: MapPin, text: "Dubai-wide" },
  ];

  const propertyTypes = [
    { value: "apartment", label: "Apartment", mobileLabel: "Apartment", icon: Building2 },
    { value: "villa-townhouse", label: "Villa/Townhouse", mobileLabel: "Villa/TH", icon: Home },
    { value: "commercial", label: "Commercial", mobileLabel: "Commercial", icon: Store },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="space-y-8 fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight">
              Don't Just List. Dominate.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Dubai's first structured real estate media booking system — book photography, video walkthroughs, and 360° tours in seconds, then manage listings and invoices from one powerful dashboard.
            </p>

            {/* CTA Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/booking">
                <Button size="lg" className="w-full sm:w-auto btn-primary-premium text-base px-8 py-3 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
                  Book Now
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto border-border text-muted-foreground hover:bg-secondary hover:text-foreground group transition-all duration-200"
                onClick={onWatchVideo}
              >
                <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
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
                  <chip.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{chip.text}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground/60">
              *Photos for any property are delivered within 24h.
            </p>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="relative fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              {/* Ambient glow behind card */}
              <div className="absolute -inset-6 bg-muted/8 blur-[60px] rounded-3xl" />
              
              <div className="relative bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex border-b border-border">
                  <button className="flex-1 py-3 px-4 text-sm font-medium bg-secondary/50 border-b-2 border-foreground/30">
                    Booking Flow
                  </button>
                  <button className="flex-1 py-3 px-4 text-sm font-medium text-muted-foreground">
                    Dashboard
                  </button>
                </div>

                <div className="p-5 md:p-6 space-y-5">
                  {/* Property Type Pills — 3 buttons matching portal */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Property Type</p>
                    <div className="grid grid-cols-3 gap-2">
                      {propertyTypes.map((pt) => {
                        const Icon = pt.icon;
                        return (
                          <button
                            key={pt.value}
                            onClick={() => setActivePropertyType(pt.value)}
                            className={`py-3.5 px-3 rounded-xl text-xs font-semibold transition-all duration-[180ms] active:scale-[0.98] border text-center flex flex-col items-center gap-1.5 ${
                              activePropertyType === pt.value
                                ? "bg-foreground text-background border-foreground/20 shadow-sm"
                                : "bg-secondary border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.02]"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="hidden md:inline">{pt.label}</span>
                            <span className="md:hidden">{pt.mobileLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Select Service</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["Photography", "Video", "360° Tour"].map((service, i) => (
                        <button
                          key={service}
                          onClick={() => setActiveService(i)}
                          className={`p-3 rounded-xl border text-center text-xs font-medium transition-all duration-[180ms] active:scale-[0.98] ${
                            activeService === i 
                              ? "border-foreground/20 bg-secondary/80 text-foreground" 
                              : "border-border text-muted-foreground hover:bg-secondary/50"
                          }`}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schedule */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Schedule</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-secondary rounded-xl text-xs text-center text-muted-foreground">
                        Dec 15, 2024
                      </div>
                      <div className="p-3 bg-secondary rounded-xl text-xs text-center text-muted-foreground">
                        <p>Morning</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Arrival: 9:30 – 10 AM</p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full btn-primary-premium text-sm">
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
