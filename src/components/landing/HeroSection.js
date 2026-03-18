import { BadgeCheck, Building2, Clock, Home, MapPin, Play, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const HeroSection = ({ onWatchVideo }) => {
  const [activePropertyType, setActivePropertyType] = useState("apartment");
  const [activeService, setActiveService] = useState(0);

  const trustChips = [
    { icon: Clock, text: "Photos in 24h*" },
    { icon: BadgeCheck, text: "From AED 350" },
    { icon: MapPin, text: "Dubai-wide" },
  ];

  const propertyTypes = [
    {
      value: "apartment",
      label: "Apartment",
      mobileLabel: "Apartment",
      icon: Building2,
    },
    {
      value: "villa-townhouse",
      label: "Villa/Townhouse",
      mobileLabel: "Villa/TH",
      icon: Home,
    },
    {
      value: "commercial",
      label: "Commercial",
      mobileLabel: "Commercial",
      icon: Store,
    },
  ];

  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="fade-in space-y-8">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Don't Just List. Dominate.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Dubai&apos;s first structured real estate media booking system, book
              photography, video walkthroughs, and 360° tours in seconds, then
              manage listings and invoices from one powerful dashboard.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/booking">
                <Button
                  size="lg"
                  className="btn-primary-premium w-full px-8 py-3 text-base transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] sm:w-auto"
                >
                  Book Now
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="group w-full border-border text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground sm:w-auto"
                onClick={onWatchVideo}
              >
                <Play className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                Watch How It Works
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              {trustChips.map((chip) => (
                <div
                  key={chip.text}
                  className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm"
                >
                  <chip.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{chip.text}</span>
                </div>
              ))}
            </div>

          </div>

          <div className="fade-in relative" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl bg-muted/5 blur-[16px]" />

              <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-xl">
                <div className="flex border-b border-border">
                  <button
                    type="button"
                    className="flex-1 border-b-2 border-foreground/30 bg-secondary/50 px-4 py-3 text-sm font-medium"
                  >
                    Booking Flow
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground"
                  >
                    Dashboard
                  </button>
                </div>

                <div className="space-y-5 p-5 md:p-6">
                  <div>
                    <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Property Type
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {propertyTypes.map((propertyType) => {
                        const Icon = propertyType.icon;
                        const isActive =
                          activePropertyType === propertyType.value;

                        return (
                          <button
                            key={propertyType.value}
                            type="button"
                            onClick={() =>
                              setActivePropertyType(propertyType.value)
                            }
                            className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-center text-xs font-semibold transition-all duration-[180ms] active:scale-[0.98] ${
                              isActive
                                ? "border-foreground/20 bg-foreground text-background shadow-sm"
                                : "border-border bg-secondary text-muted-foreground hover:scale-[1.02] hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="hidden md:inline">
                              {propertyType.label}
                            </span>
                            <span className="md:hidden">
                              {propertyType.mobileLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Select Service
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {["Photography", "Video", "360° Tour"].map(
                        (service, index) => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => setActiveService(index)}
                            className={`rounded-xl border p-3 text-center text-xs font-medium transition-all duration-[180ms] active:scale-[0.98] ${
                              activeService === index
                                ? "border-foreground/20 bg-secondary/80 text-foreground"
                                : "border-border text-muted-foreground hover:bg-secondary/50"
                            }`}
                          >
                            {service}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Schedule
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-secondary p-3 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
                        Dec 15, 2024
                      </div>
                      <div className="rounded-xl bg-secondary p-3 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
                        <p>Morning</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                          Arrival: 9:30 - 10 AM
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button className="btn-primary-premium w-full text-sm">
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
