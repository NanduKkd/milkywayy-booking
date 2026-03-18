import { CheckCheck, ClipboardList, Clock3, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { verifyStripeSession } from "@/lib/actions/bookings";

const formatCurrency = (value) =>
  `AED ${Number(value || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default async function BookingSuccessPage({ searchParams }) {
  const { session_id } = await searchParams;

  let bookingRef = "MWY-BOOKED";
  let paymentVerified = false;
  let verificationMessage = "";
  let bookingReferences = [];
  let bookingSummaries = [];
  let totalPaidAmount = 0;
  if (session_id) {
    const verification = await verifyStripeSession(session_id);
    const verificationData = verification?.data || null;

    paymentVerified = Boolean(verification?.success);
    verificationMessage = verification?.message || verificationData?.message || "";
    bookingReferences = Array.isArray(verificationData?.bookingReferences)
      ? verificationData.bookingReferences
      : [];
    bookingSummaries = Array.isArray(verificationData?.bookingSummaries)
      ? verificationData.bookingSummaries
      : verificationData?.bookingSummary
        ? [verificationData.bookingSummary]
        : [];
    totalPaidAmount =
      Number(verificationData?.totalPaidAmount || 0) ||
      bookingSummaries.reduce(
        (sum, summary) => sum + Number(summary?.amount || 0),
        0,
      );
    bookingRef =
      bookingReferences.length > 0
        ? bookingReferences.join(", ")
        : `MW-${String(session_id).slice(-8).toUpperCase()}`;
  }

  const hasBookingSummaries = bookingSummaries.length > 0;
  const hasMultipleBookings = bookingSummaries.length > 1;

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

        <div className="mx-auto max-w-4xl fade-in space-y-6">
    {/*<section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-zinc-900/95 via-slate-950/90 to-zinc-900/90 backdrop-blur-sm">*/}
          <section className="premium-card rounded-[28px]">
            <div className="p-8 md:p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
              <CheckCheck className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight">
              {paymentVerified ? "Booking Confirmed" : "Confirmation Pending"}
            </h2>
            <div className="inline-flex items-center px-4 py-2 bg-secondary/50 border border-border rounded-full">
              <span className="text-xs text-muted-foreground mr-2">
                Booking ID{bookingReferences.length === 1 ? "" : "s"}:
              </span>
              <span className="text-xs font-semibold">{bookingRef}</span>
            </div>
          </div>

          <div className="mx-6 border-t border-border/30 md:mx-10"></div>

          <div className="p-6 md:p-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5">
              What Happens Next
            </p>

            <div className="grid gap-4 border-b border-border/30 py-4 md:grid-cols-[44px_minmax(0,1fr)] md:items-start">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Arrival Window{hasMultipleBookings ? "s" : ""}
                  </p>
                  {hasBookingSummaries ? (
                    <div className="mt-2 space-y-2">
                      {bookingSummaries.map((summary) => (
                        <div
                          key={summary.bookingReference || summary.propertyTitle}
                          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-foreground">
                            {summary.propertyTitle}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {summary.arrivalWindow ||
                              "To be confirmed. Please ensure property access is ready."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      To be confirmed. Please ensure property access is ready.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 border-b border-border/30 py-4 md:grid-cols-[44px_minmax(0,1fr)] md:items-start">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Booking Summary</p>
                  {hasBookingSummaries ? (
                    <div className="mt-2 space-y-3">
                      {bookingSummaries.map((summary) => (
                        <div
                          key={summary.bookingReference || summary.propertyTitle}
                          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                {summary.propertyTitle}
                              </p>
                              {summary.bookingReference && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {summary.bookingReference}
                                </p>
                              )}
                              {summary.location && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {summary.location}
                                </p>
                              )}
                              {summary.services && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Services: {summary.services}
                                </p>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              {formatCurrency(summary.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {hasMultipleBookings && totalPaidAmount > 0 && (
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Total Paid
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(totalPaidAmount)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          Property booking
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 py-4 md:grid-cols-[44px_minmax(0,1fr)] md:items-start">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Project Delivery Timeline</p>
                  {hasBookingSummaries ? (
                    <div className="mt-2 space-y-2">
                      {bookingSummaries.map((summary) => (
                        <div
                          key={`${summary.bookingReference || summary.propertyTitle}-timeline`}
                          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-foreground">
                            {summary.propertyTitle}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {summary.deliveryTimeline ||
                              "Delivery timeline will be shared shortly."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Delivery timeline will be shared shortly.
                    </p>
                  )}
                </div>
              </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
