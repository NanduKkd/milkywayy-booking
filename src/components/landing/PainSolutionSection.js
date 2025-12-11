import { X, Check } from "lucide-react";
const PainSolutionSection = () => {
  const beforeItems = ["Availability ping-pong", "Unclear packages & pricing", "No tracking", "Chasing files", "Lost invoices"];
  const afterItems = ["Book instantly", "Clear options upfront", "Automated discounts / wallet", "Track every shoot", "Download files & invoices anytime"];
  return <section className="py-24 relative">
      <div className="starfield opacity-10" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16 fade-in">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            The old way wastes time. The portal fixes it.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Before - WhatsApp chaos */}
          <div className="bg-card border border-border rounded-2xl p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-heading text-xl font-bold">WhatsApp Chaos</h3>
            </div>
            <ul className="space-y-4">
              {beforeItems.map((item, index) => <li key={index} className="flex items-center gap-3 text-muted-foreground">
                  <X className="w-4 h-4 text-destructive/70 flex-shrink-0" />
                  <span>{item}</span>
                </li>)}
            </ul>
          </div>

          {/* After - Milkywayy Portal */}
          <div className="bg-card border border-accent/30 rounded-2xl p-8 relative overflow-hidden fade-in" style={{
          animationDelay: "0.1s"
        }}>
            <div className="absolute inset-0 bg-accent/5" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-bold">Milkywayy Portal</h3>
              </div>
              <ul className="space-y-4">
                {afterItems.map((item, index) => <li key={index} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>{item}</span>
                  </li>)}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-center text-xl font-heading font-bold mt-12 fade-in">Stop coordinating. Start listing.</p>
      </div>
    </section>;
};
export default PainSolutionSection;
