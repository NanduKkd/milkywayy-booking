"use client";

import { Check } from "lucide-react";
import {
  BOOKING_WORKFLOW_STATUS,
  BOOKING_WORKFLOW_STEPS,
  getWorkflowStatus,
} from "@/lib/helpers/bookingWorkflow";
import { cn } from "@/lib/utils";

export default function BookingWorkflowTracker({
  booking,
  className,
  compact = false,
  verticalOnMobile = false,
}) {
  const currentStatus = getWorkflowStatus(booking);
  const currentIndex = BOOKING_WORKFLOW_STEPS.findIndex(
    (step) => step.status === currentStatus,
  );
  const cancelled = Boolean(
    booking?.cancelledAt || booking?.status === "CANCELLED",
  );

  if (cancelled) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300",
          className,
        )}
      >
        Booking Cancelled
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full pb-1",
        verticalOnMobile
          ? "overflow-visible sm:overflow-x-auto"
          : "overflow-x-auto",
        className,
      )}
    >
      <div
        className={cn(
          "grid min-w-[620px] grid-cols-5",
          verticalOnMobile &&
            "min-w-0 grid-cols-1 sm:min-w-[620px] sm:grid-cols-5",
        )}
      >
        {BOOKING_WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const revisionActive =
            step.status === BOOKING_WORKFLOW_STATUS.EDITING &&
            currentStatus === BOOKING_WORKFLOW_STATUS.EDITING &&
            Number(booking?.revisionCount || 0) > 0;

          return (
            <div
              key={step.status}
              className={cn(
                "relative flex min-w-0 flex-col items-center px-1 text-center",
                verticalOnMobile &&
                  "flex-row items-start pb-5 text-left last:pb-0 sm:flex-col sm:items-center sm:pb-0 sm:text-center",
              )}
            >
              {verticalOnMobile &&
                index < BOOKING_WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "absolute bottom-0 left-[16px] top-6 w-px sm:hidden",
                      index < currentIndex ? "bg-zinc-400" : "bg-zinc-800",
                    )}
                  />
                )}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute right-1/2 top-3 h-px w-[calc(100%-24px)] -translate-x-3",
                    verticalOnMobile && "hidden sm:block",
                    index <= currentIndex ? "bg-zinc-400" : "bg-zinc-800",
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px]",
                  (isCompleted || isActive) &&
                    "border-zinc-300 bg-zinc-300 text-zinc-900",
                  !isCompleted &&
                    !isActive &&
                    "border-zinc-700 bg-[#151515] text-zinc-600",
                )}
              >
                {isCompleted || isActive ? (
                  <Check size={13} strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </div>
              <div
                className={cn(
                  verticalOnMobile && "ml-3 pt-0.5 sm:ml-0 sm:pt-0",
                )}
              >
                <p
                  className={cn(
                    "mt-2 text-[10px] sm:text-xs",
                    verticalOnMobile && "mt-0 text-sm sm:mt-2 sm:text-xs",
                    isCompleted || isActive ? "text-zinc-200" : "text-zinc-600",
                  )}
                >
                  {step.label}
                </p>
                {!compact && revisionActive && (
                  <p className="mt-1 text-[10px] text-amber-400">
                    Revision {booking.revisionCount} of 2 requested
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
