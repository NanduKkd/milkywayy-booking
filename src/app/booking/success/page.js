import { CheckCheck, ClipboardList, Clock3, Zap } from "lucide-react";
import Link from "next/link";
import { verifyStripeSession } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";

export default async function BookingSuccessPage({ searchParams }) {
  const { session_id } = await searchParams;

  let bookingRef = "MWY-BOOKED";
  let paymentVerified = false;
  let verificationMessage = "";
  if (session_id) {
    const verification = await verifyStripeSession(session_id);
    paymentVerified = Boolean(verification?.success);
    verificationMessage = verification?.message || "";
    bookingRef = `MW-${String(session_id).slice(-8).toUpperCase()}`;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-10 fade-in">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Milkywayy Portal
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 tracking-tight">
            {paymentVerified ? "Thank You" : "Payment Processing"}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
            {paymentVerified
              ? "Your booking has been confirmed"
              : "We are still verifying your payment. Please refresh in a few seconds."}
          </p>
          {!paymentVerified && session_id && (
            <p className="text-xs text-amber-300 mt-3">{verificationMessage}</p>
          )}
        </div>

        <div className="max-w-xl mx-auto fade-in space-y-6">
          <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#141517]/95 via-[#16171a]/95 to-[#121316]/95 backdrop-blur-sm overflow-hidden">
            <div className="p-8 md:p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
              <CheckCheck className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight">
              {paymentVerified ? "Booking Confirmed" : "Confirmation Pending"}
            </h2>
            <div className="inline-flex items-center px-4 py-2 bg-secondary/50 border border-border rounded-full">
              <span className="text-xs text-muted-foreground mr-2">Booking ID:</span>
              <span className="text-xs font-semibold">{bookingRef}</span>
            </div>
          </div>

          <div className="border-t border-border/30 mx-6 md:mx-8"></div>

          <div className="p-6 md:p-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5">
              What Happens Next
            </p>

            <div className="flex items-start gap-4 py-4 border-b border-border/30">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Arrival Window</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    To be confirmed. Please ensure property access is ready.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 py-4 border-b border-border/30">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Booking Summary</p>
                      <p className="text-xs font-medium text-foreground mt-0.5">2 Bed Apartment</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Services: Videography</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">AED 450</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Project Delivery Timeline</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    - Video Walkthrough - Delivered within 24-48h
                  </p>
                </div>
              </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button asChild className="rounded-xl bg-gradient-to-b from-white to-zinc-300 text-black hover:from-zinc-100 hover:to-zinc-300 h-11">
            <Link href="/dashboard/bookings">View Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-white/15 bg-transparent hover:bg-white/5 h-11">
            <Link href="/dashboard/invoices">Download Invoice</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-white/15 bg-transparent hover:bg-white/5 h-11">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}



