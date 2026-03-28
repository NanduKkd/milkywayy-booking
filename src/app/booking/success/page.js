import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyStripeSession } from "@/lib/actions/bookings";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  const hasDecimals = Math.round(amount * 100) % 100 !== 0;

  return `AED ${amount.toLocaleString("en-GB", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

const getPeriodLabel = (timeLabel) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(timeLabel || "").trim());
  if (!match) return "";

  const hour = Number(match[1]);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
};

const formatArrivalRange = (timeLabel) => {
  const normalizedLabel = String(timeLabel || "").trim();
  if (!normalizedLabel) return "";
  if (normalizedLabel.includes(" - ")) return normalizedLabel;

  const match = /^(\d{1,2}):(\d{2})$/.exec(normalizedLabel);
  if (!match) return normalizedLabel;

  const startMinutes = (Number(match[1]) * 60) + Number(match[2]);
  const endMinutes = startMinutes + 30;
  const endHour = Math.floor(endMinutes / 60) % 24;
  const endMinute = endMinutes % 60;

  return `${normalizedLabel} - ${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
};

const getArrivalMeta = (arrivalWindow) => {
  const [dateLabel = "", timeLabel = ""] = String(arrivalWindow || "")
    .split("·")
    .map((segment) => segment.trim())
    .filter(Boolean);

  return {
    dateLabel,
    periodLabel: getPeriodLabel(timeLabel),
    arrivalLabel: timeLabel ? `Arrival ${formatArrivalRange(timeLabel)}` : "",
  };
};

export default async function BookingSuccessPage({ searchParams }) {
  const { session_id } = await searchParams;

  let bookingRef = "MWB-BOOKED";
  let paymentVerified = false;
  let verificationMessage = "";
  let bookingReferences = [];
  let bookingSummaries = [];
  let totalPaidAmount = 0;
  if (session_id) {
    const verification = await verifyStripeSession(session_id);
    const verificationData = verification?.data || null;

    paymentVerified = Boolean(verificationData?.paymentVerified);
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
  const displaySummaries = hasBookingSummaries
    ? bookingSummaries
    : session_id
      ? [{
          bookingReference: bookingRef,
          propertyTitle: paymentVerified ? "Property booking" : "Payment processing",
          location: paymentVerified
            ? "Your booking details have been sent to WhatsApp."
            : "Your confirmed booking details will appear here once payment verification completes.",
          services: paymentVerified
            ? "Your selected services have been confirmed via WhatsApp."
            : "We will send your booking details and updates via WhatsApp shortly.",
          arrivalWindow: "",
          amount: totalPaidAmount,
        }]
      : [];
  const statusTitle = paymentVerified ? "Booking Confirmed" : "Confirmation Pending";
  const statusCopy = paymentVerified
    ? "Your shoot has been successfully scheduled."
    : "We are still verifying your payment and locking in your booking.";
  const supportCopy = paymentVerified
    ? "We've sent your booking details and updates via WhatsApp."
    : verificationMessage || "Please refresh in a few seconds. We'll update you on WhatsApp as soon as it clears.";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-10 md:pt-14">
      <div className="container relative z-10 mx-auto px-4 md:px-6">



    {paymentVerified ? (
      <div className="text-center mb-10 fade-in">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Milkywayy Portal
        </p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 tracking-tight">
          Thank You
        </h1>
      </div>
    ): null}




        <div className="mx-auto max-w-3xl fade-in overflow-hidden rounded-[30px] border border-white/[0.06] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.02),_rgba(255,255,255,0.01))] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <section className="border-b border-white/[0.05] px-6 pb-14 pt-16 text-center md:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <CheckCheck className="h-8 w-8 text-foreground" />
            </div>
            <h1 className="mt-8 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {statusTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-foreground/72 md:text-sm">
              {statusCopy}
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-2xs text-muted-foreground md:text-xs">
              {supportCopy}
            </p>
          </section>

          {displaySummaries.length > 0 && (
            <section className="px-4 py-8 md:px-7 md:py-10">
              <p className="text-2xs font-medium uppercase tracking-[0.25em] text-muted-foreground/90">
                Your Booking{displaySummaries.length === 1 ? "" : "s"} ({displaySummaries.length})
              </p>

              <div className="mt-5 space-y-4">
                {displaySummaries.map((summary, index) => {
                  const { dateLabel, periodLabel, arrivalLabel } = getArrivalMeta(
                    summary?.arrivalWindow,
                  );

                  return (
                    <article
                      key={summary.bookingReference || `${summary.propertyTitle}-${index}`}
                      className="rounded-[22px] border border-white/[0.05] bg-black/[0.14] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:px-6 md:py-6"
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-foreground md:text-base">
                              {summary.propertyTitle || "Property booking"}
                            </h2>
                            {(dateLabel || periodLabel || arrivalLabel) && (
                              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground md:text-xs">
                                {dateLabel && <span>{dateLabel}</span>}
                                {periodLabel && (
                                  <>
                                    {dateLabel && <span className="text-white/20">·</span>}
                                    <span>{periodLabel}</span>
                                  </>
                                )}
                                {arrivalLabel && (
                                  <>
                                    {(dateLabel || periodLabel) && (
                                      <span className="text-white/20">·</span>
                                    )}
                                    <span>{arrivalLabel}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {summary.bookingReference && (
                              <p className="mt-2 text-2xs text-muted-foreground md:text-xs">
                                Booking ID:
                                {" "}
                                <span className="tracking-[0.08em] text-foreground/72">
                                  {summary.bookingReference}
                                </span>
                              </p>
                            )}
                          </div>

                          {Number(summary?.amount || 0) > 0 && (
                            <p className="shrink-0 text-sm font-semibold text-foreground md:pt-0.5 md:text-base">
                              {formatCurrency(summary.amount)}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-x-6 gap-y-3 border-t border-white/[0.05] pt-4 text-2xs md:grid-cols-[120px_minmax(0,1fr)] md:items-start md:text-xs">
                          <p className="text-muted-foreground">Location</p>
                          <p className="break-words text-foreground/88 md:text-right">
                            {summary.location || "Shared in your confirmation message."}
                          </p>

                          <p className="text-muted-foreground">Services</p>
                          <p className="break-words text-foreground/88 md:text-right">
                            {summary.services || "Shared in your confirmation message."}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>



<div className="px-5 md:px-2 mt-4 pb-8 space-y-5"><div className="pt-4"><p className="text-xs text-muted-foreground">Please ensure property access is ready during the arrival window.</p></div><div className="border-t border-border/20 pt-4"><p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Updates</p><p className="text-xs text-muted-foreground leading-relaxed">Booking confirmations and arrival notifications are sent via WhatsApp.</p><p className="text-xs text-muted-foreground leading-relaxed mt-1">Need to adjust timing or details? Message us — we'll assist based on availability.</p></div></div>




            </section>
          )}
        </div>

        <div className="mx-auto mt-5 grid max-w-3xl gap-3 md:grid-cols-2">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-11 rounded-2xl border-white/[0.1] bg-white/[0.06] text-sm font-medium text-foreground hover:bg-white/[0.1] hover:text-foreground"
          >
            <Link href="/dashboard/bookings">Go to Dashboard</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-11 rounded-2xl border-white/[0.1] bg-transparent text-sm font-medium text-foreground hover:bg-white/[0.05] hover:text-foreground"
          >
            <Link href="/booking">Book Another Shoot</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
