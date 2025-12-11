import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Link from 'next/link'
const FinalCTASection = () => {
  return <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center fade-in">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Ready to stop wasting time on
shoot coordination?
        </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Book in a minute. Deliver faster. Keep everything organized.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/booking">
              <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse px-8">
                Book Now
              </Button>
            </Link>
            <a href="https://wa.me/971507263306" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-border hover:bg-secondary">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp Us
              </Button>
            </a>
          </div>

          <p className="text-sm text-accent">
            Launch Offer: Flat 50% off your first booking.
          </p>
        </div>
      </div>
    </section>;
};
export default FinalCTASection;
