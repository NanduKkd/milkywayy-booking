"use client";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAvailabilityForRange } from "@/lib/actions/bookings";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  { value: "09:00", period: "morning", label: "Morning", startTime: "09:00", endTime: "12:00" },
  { value: "13:00", period: "afternoon", label: "Afternoon", startTime: "13:00", endTime: "16:00" },
  { value: "17:00", period: "evening", label: "Evening", startTime: "17:00", endTime: "20:00" },
];

const LEGACY_BLOCK_TO_HOURLY = {
  morning: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  afternoon: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  evening: ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
};

const PERIOD_ORDER = ["morning", "afternoon", "evening"];

export default function DateSlotPicker({
  date,
  slot,
  onDateChange,
  onSlotChange,
  minDate = new Date(),
  maxDate,
  error,
  duration = 1,
  isNightService = false,
  blockedSlotsMap = {},
}) {
  const [isOpen, setIsOpen] = useState(false);

  const parseDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = parseDate(date);
    return d ? d.getMonth() : new Date().getMonth();
  });
  const [currentYear, setCurrentYear] = useState(() => {
    const d = parseDate(date);
    return d ? d.getFullYear() : new Date().getFullYear();
  });
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Fetch availability when month/year changes
  useEffect(() => {
    if (!isOpen) return; // Only fetch when modal is open

    const fetchAvailability = async () => {
      setLoading(true);
      try {
        // Calculate start and end of the month
        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0);

        // Adjust to local string format YYYY-MM-DD for the API
        const offset = startDate.getTimezoneOffset();
        const adjustedStart = new Date(
          startDate.getTime() - offset * 60 * 1000,
        );
        const startStr = adjustedStart.toISOString().split("T")[0];

        const offsetEnd = endDate.getTimezoneOffset();
        const adjustedEnd = new Date(endDate.getTime() - offsetEnd * 60 * 1000);
        const endStr = adjustedEnd.toISOString().split("T")[0];

        const res = await getAvailabilityForRange(startStr, endStr);
        const data = res.success ? res.data : {};
        setAvailability(data);
      } catch (err) {
        console.error("Failed to fetch availability", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [currentMonth, currentYear, isOpen]);

  const getDaysInMonth = (month, year) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDay = date.getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= lastDate; day++) {
      days.push(day);
    }
    return days;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day) => {
    if (!day) return;
    // Create date object in local time
    const selected = new Date(currentYear, currentMonth, day);
    // Adjust for timezone offset to get correct YYYY-MM-DD
    const offset = selected.getTimezoneOffset();
    const adjustedDate = new Date(selected.getTime() - offset * 60 * 1000);
    const dateStr = adjustedDate.toISOString().split("T")[0];

    onDateChange(dateStr);
    onSlotChange(""); // Reset slot when date changes
  };

  const visibleSlots = useMemo(() => {
    if (isNightService) {
      return TIME_SLOTS.filter((slotMeta) => slotMeta.period === "evening");
    }
    return TIME_SLOTS.filter(
      (slotMeta) =>
        slotMeta.period === "morning" || slotMeta.period === "afternoon",
    );
  }, [isNightService]);

  const isDateDisabled = (day) => {
    if (!day) return true;
    const dateObj = new Date(currentYear, currentMonth, day);

    // Check minDate
    const minDateStart = new Date(minDate);
    minDateStart.setHours(0, 0, 0, 0);
    if (dateObj < minDateStart) return true;
    if (maxDate) {
      const maxDateEnd = new Date(maxDate);
      maxDateEnd.setHours(23, 59, 59, 999);
      if (dateObj > maxDateEnd) return true;
    }

    // Check availability
    // Construct date string YYYY-MM-DD
    const offset = dateObj.getTimezoneOffset();
    const adjustedDate = new Date(dateObj.getTime() - offset * 60 * 1000);
    const dateStr = adjustedDate.toISOString().split("T")[0];

    const serverBlocked = availability[dateStr] || [];
    const localBlocked = blockedSlotsMap[dateStr] || [];
    const blockedSlots = [...new Set([...serverBlocked, ...localBlocked])];

    // Check if ANY valid start slot exists for this date
    const hasValidSlot = visibleSlots.some((timeSlot) => {
      return isSlotAvailable(timeSlot.value, blockedSlots);
    });

    return !hasValidSlot;
  };

  const isSlotAvailable = (startSlotValue, blockedSlots) => {
    const normalizeBlockedSlots = (rawSlots) => {
      const expanded = new Set();
      rawSlots.forEach((raw) => {
        if (LEGACY_BLOCK_TO_HOURLY[raw]) {
          LEGACY_BLOCK_TO_HOURLY[raw].forEach((h) => expanded.add(h));
          return;
        }
        if (raw === 1 || raw === "1") {
          LEGACY_BLOCK_TO_HOURLY.morning.forEach((h) => expanded.add(h));
          return;
        }
        if (raw === 2 || raw === "2") {
          LEGACY_BLOCK_TO_HOURLY.afternoon.forEach((h) => expanded.add(h));
          return;
        }
        if (raw === 3 || raw === "3") {
          LEGACY_BLOCK_TO_HOURLY.evening.forEach((h) => expanded.add(h));
          return;
        }
        expanded.add(String(raw));
      });
      return expanded;
    };

    const startSlotMeta = TIME_SLOTS.find((s) => s.value === startSlotValue);
    if (!startSlotMeta) return false;
    const startPeriodIdx = PERIOD_ORDER.indexOf(startSlotMeta.period);
    if (startPeriodIdx === -1) return false;

    const expandedBlockedSlots = normalizeBlockedSlots(blockedSlots);

    const blocksNeeded = Math.min(Math.max(parseInt(duration, 10) || 1, 1), 2);
    let requiredPeriods = [startSlotMeta.period];
    if (blocksNeeded === 2) {
      if (isNightService) {
        // PDF rule: for night services with >6 weight, evening path blocks A+E.
        if (startSlotMeta.period !== "evening") return false;
        requiredPeriods = ["afternoon", "evening"];
      } else {
        if (startSlotMeta.period === "morning") {
          requiredPeriods = ["morning", "afternoon"];
        } else if (startSlotMeta.period === "afternoon") {
          requiredPeriods = ["afternoon", "evening"];
        } else {
          return false;
        }
      }
    }

    for (const period of requiredPeriods) {
      const periodHourly = LEGACY_BLOCK_TO_HOURLY[period] || [];
      const periodBlocked = periodHourly.some((hour) =>
        expandedBlockedSlots.has(hour),
      );
      if (periodBlocked) return false;
    }

    return true;
  };

  const isSelected = (day) => {
    if (!date || !day) return false;
    const selectedDate = parseDate(date);
    if (!selectedDate) return false;

    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);

  // Get blocked slots for currently selected date
  const currentBlockedSlots = useMemo(() => {
    if (!date) return [];
    const serverBlocked = availability[date] || [];
    const localBlocked = blockedSlotsMap[date] || [];
    return [...new Set([...serverBlocked, ...localBlocked])];
  }, [date, availability, blockedSlotsMap]);

  const formatDisplayValue = () => {
    if (!date) return "";
    const d = parseDate(date);
    const dateStr = d ? d.toLocaleDateString() : "";
    const slotLabel = TIME_SLOTS.find((s) => s.value === String(slot))?.label || "";
    return slotLabel ? `${dateStr} - ${slotLabel} ` : dateStr;
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            value={formatDisplayValue()}
            placeholder="Select Date & Time"
            readOnly
            className={cn(
              "pl-9 cursor-pointer bg-[#272727] border-zinc-700 text-foreground placeholder:text-muted-foreground focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white",
              error && "border-red-500 focus-visible:ring-red-500",
            )}
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl bg-background text-foreground p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 border-b border-zinc-800">
            <DialogTitle>Select Date & Time</DialogTitle>
            <DialogDescription className="sr-only">
              Choose a date and a time slot for your booking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Calendar Section */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <Button
                  onClick={handlePrevMonth}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-zinc-800 hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold text-foreground">
                  {new Date(currentYear, currentMonth).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </h2>
                <Button
                  onClick={handleNextMonth}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-zinc-800 hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 relative min-h-[200px]">
                {loading && (
                  <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                  </div>
                )}
                {daysInMonth.map((day, index) => {
                  const disabled = isDateDisabled(day);
                  return (
                    <button
                      key={index}
                      onClick={() => !disabled && handleDateClick(day)}
                      disabled={disabled}
                      type="button"
                      className={cn(
                        "h-9 w-full rounded-lg text-sm flex items-center justify-center transition-colors relative",
                        !day && "invisible",
                        isSelected(day)
                          ? "bg-white text-black font-semibold"
                          : isToday(day)
                            ? "bg-secondary text-secondary-foreground border"
                            : "text-foreground hover:bg-secondary",
                        disabled &&
                          "opacity-30 cursor-not-allowed hover:bg-transparent text-muted-foreground",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slot Selection Section */}
            <div className="border-t md:border-t-0 md:border-l border-zinc-800 p-6 flex flex-col bg-background max-h-[400px] md:max-h-none overflow-y-auto">
              <h3 className="text-md font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock size={18} />
                Available Slots
              </h3>

              {!date
                ? <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic min-h-[100px]">
                    Select a date to view slots
                  </div>
                : <div className="space-y-3">
                    <p className="text-sm text-gray-400 mb-2">
                      For {new Date(date).toLocaleDateString()}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {visibleSlots.map((timeSlot) => {
                        const isAvailable = isSlotAvailable(
                          timeSlot.value,
                          currentBlockedSlots,
                        );
                        const isSelectedSlot = slot === timeSlot.value;

                        return (
                          <button
                            key={timeSlot.value}
                            onClick={() =>
                              isAvailable && onSlotChange(timeSlot.value)
                            }
                            disabled={!isAvailable}
                            type="button"
                            className={cn(
                              "px-3 py-2 rounded-lg border text-xs font-medium transition-all flex justify-between items-center w-full",
                              isSelectedSlot
                                ? "bg-white text-black border-white"
                                : "bg-secondary text-secondary-foreground border",
                             !isAvailable &&
                                "cursor-not-allowed bg-muted text-muted-foreground opacity-50",
                            )}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{timeSlot.label}</span>
                              <span className="text-xs text-gray-400">
                                {timeSlot.startTime} - {timeSlot.endTime}
                              </span>
                            </div>
                            {isSelectedSlot && (
                              <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>}
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-zinc-800">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              Cancel
            </Button>
            <Button
              className="bg-white text-black font-semibold hover:bg-zinc-200"
              onClick={() => setIsOpen(false)}
              disabled={!date || !slot}
            >
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
