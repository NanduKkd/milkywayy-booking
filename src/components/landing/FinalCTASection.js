import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const FinalCTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden border-y border-border/50">
      <div className="starfield opacity-10" aria-hidden />
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center fade-in">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight text-foreground">
            Ready to Book Smarter?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Book in minutes. Deliver faster. Keep everything organized.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/booking">
              <Button
                size="lg"
                className="w-full sm:w-auto btn-primary-premium px-8"
              >
                Book Now
              </Button>
            </Link>
            <a
              href="https://wa.me/971507263306"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-border hover:bg-secondary"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp Us
              </Button>
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            Launch Offer: Flat 50% off your first booking.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
