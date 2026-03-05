import {
  BadgeCheck,
  Building,
  Building2,
  Clock,
  Home,
  MapPin,
  Play,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const HeroSection = ({ onWatchVideo }) => {
  const trustChips = [
    { icon: Clock, text: "Photos in 24h*" },
    { icon: BadgeCheck, text: "From AED 350" },
    { icon: MapPin, text: "Dubai-wide" },
  ];

  const propertyTypes = [
    { label: "Apartment", icon: Building2, active: true },
    { label: "Villa/Townhouse", icon: Home, active: false },
    { label: "Commercial", icon: Building, active: false },
  ];

  const serviceTypes = ["Photography", "Video", "360 Tour"];

  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden">
      <div className="absolute inset-0 bg-black border-b border-white/10" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 fade-in">
            <h1 className="font-heading text-5xl md:text-6xl font-bold leading-[0.96] text-white">
              Don&apos;t Just List.
              <br />
              Dominate.
            </h1>
            <p className="text-2xl/8 text-white/80 max-w-2xl">
              Dubai&apos;s first structured real estate media booking system.
              Book photography, video walkthroughs, and 360 tours in seconds,
              then manage listings and invoices from one powerful dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/booking">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 text-base px-9 rounded-2xl"
                >
                  Book Now
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10 text-base rounded-2xl"
                onClick={onWatchVideo}
              >
                <Play className="w-4 h-4 mr-2" />
                Watch How It Works
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              {trustChips.map((chip) => (
                <div
                  key={chip.text}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm text-white"
                >
                  <chip.icon className="w-4 h-4 text-white/80" />
                  <span>{chip.text}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-white/60">
              *Photos for any property are delivered within 24h.
            </p>
          </div>

          <div className="relative fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-3xl" />
            <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex border-b border-white/10">
                <button
                  type="button"
                  className="flex-1 py-3 px-4 text-sm font-medium bg-white/10 border-b-2 border-white text-white"
                >
                  Booking Flow
                </button>
                <button
                  type="button"
                  className="flex-1 py-3 px-4 text-sm font-medium text-white/60"
                >
                  Dashboard
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm font-medium text-white mb-3">
                    Select Property Type
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {propertyTypes.map((propertyType) => (
                      <div
                        key={propertyType.label}
                        className={`rounded-lg border p-3 text-center text-xs flex flex-col items-center justify-center gap-2 min-h-[80px] ${
                          propertyType.active
                            ? "border-white bg-white/10 text-white"
                            : "border-white/20 bg-white/5 text-white/60"
                        }`}
                      >
                        <propertyType.icon className="w-4 h-4" />
                        <span>{propertyType.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-white mb-3">
                    Select Service
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {serviceTypes.map((service, idx) => (
                      <span
                        key={service}
                        className={`rounded-lg border px-3 py-3 text-center text-xs ${
                          idx === 0
                            ? "border-white bg-white/10 text-white"
                            : "border-white/20 bg-white/5 text-white/60"
                        }`}
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-white mb-3">
                    Schedule
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded-lg text-sm text-center text-white">
                      Dec 15, 2024
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg text-center text-white">
                      <p className="text-sm">10:00 AM</p>
                      <p className="text-xs text-white/60">
                        Morning slot
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-white text-black hover:bg-gray-100 text-sm rounded-xl">
                  Continue to Checkout →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
