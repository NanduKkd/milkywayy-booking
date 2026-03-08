import { Check, X } from "lucide-react";

const PainSolutionSection = () => {
  const beforeItems = [
    "Availability ping-pong",
    "Unclear packages & pricing",
    "No tracking",
    "Chasing files",
    "Varying styles across listings",
  ];

  const afterItems = [
    "Book instantly",
    "Clear options upfront",
    "Track every shoot",
    "Download files & invoices anytime",
    "Consistent quality, every time",
  ];

  return (
    <section className="py-24 relative bg-secondary/20">
      <div className="starfield opacity-10" aria-hidden />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16 fade-in">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Stop Coordinating. Start Listing.
          </h2>
        </div>

        <div className="max-w-5xl mx-auto fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-muted-foreground/60">
                  Traditional Booking
                </h3>
              </div>
              <div className="space-y-5">
                {beforeItems.map((item) => (
                  <div key={item} className="flex items-center gap-4">
                    <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    <p className="text-muted-foreground/60">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Check className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Milkywayy Portal
                </h3>
              </div>
              <div className="space-y-5">
                {afterItems.map((item) => (
                  <div key={item} className="flex items-center gap-4">
                    <Check className="w-4 h-4 text-foreground/70 flex-shrink-0" />
                    <p className="text-foreground font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PainSolutionSection;
