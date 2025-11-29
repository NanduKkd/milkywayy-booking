"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Spinner,
  cn,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
} from "@heroui/react";
import { getAvailabilityForRange } from "@/lib/actions/bookings";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";

const TIME_SLOTS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export default function DateSlotPicker({
  date,
  slot,
  onDateChange,
  onSlotChange,
  minDate = new Date(),
  error,
  duration = 1,
  allowEvening = false,
  blockedSlotsMap = {},
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

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

  const isDateDisabled = (day) => {
    if (!day) return true;
    const dateObj = new Date(currentYear, currentMonth, day);

    // Check minDate
    const minDateStart = new Date(minDate);
    minDateStart.setHours(0, 0, 0, 0);
    if (dateObj < minDateStart) return true;

    // Check availability
    // Construct date string YYYY-MM-DD
    const offset = dateObj.getTimezoneOffset();
    const adjustedDate = new Date(dateObj.getTime() - offset * 60 * 1000);
    const dateStr = adjustedDate.toISOString().split("T")[0];

    const serverBlocked = availability[dateStr] || [];
    const localBlocked = blockedSlotsMap[dateStr] || [];
    const blockedSlots = [...new Set([...serverBlocked, ...localBlocked])];

    // Check if ANY valid start slot exists for this date
    const hasValidSlot = TIME_SLOTS.some((timeSlot) => {
      return isSlotAvailable(timeSlot.value, blockedSlots);
    });

    return !hasValidSlot;
  };

  const isSlotAvailable = (startSlotValue, blockedSlots) => {
    const startSlotIndex = TIME_SLOTS.findIndex(
      (s) => s.value === startSlotValue,
    );
    if (startSlotIndex === -1) return false;

    // Check if the start slot itself is blocked
    if (blockedSlots.includes(startSlotValue)) return false;

    // Check subsequent slots based on duration
    for (let i = 1; i < duration; i++) {
      const nextSlotIndex = startSlotIndex + i;

      // If we exceed available slots
      if (nextSlotIndex >= TIME_SLOTS.length) {
        // If allowEvening is true and we are extending FROM the last slot (evening)
        // We allow it.
        // But wait, if duration is 2 and we start at Evening (index 2), next is index 3.
        // If allowEvening is true, we allow this extension.
        if (allowEvening) {
          continue;
        } else {
          return false;
        }
      }

      const nextSlotValue = TIME_SLOTS[nextSlotIndex].value;
      if (blockedSlots.includes(nextSlotValue)) return false;
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
    const slotLabel = TIME_SLOTS.find((s) => s.value === slot)?.label || "";
    return slotLabel ? `${dateStr} - ${slotLabel} ` : dateStr;
  };

  return (
    <>
      <div onClick={onOpen} className="cursor-pointer">
        <Input
          value={formatDisplayValue()}
          placeholder="Select Date & Time"
          variant="bordered"
          readOnly
          startContent={<CalendarIcon className="text-gray-400" size={16} />}
          classNames={{
            inputWrapper:
              "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white cursor-pointer",
            input: "text-white cursor-pointer",
          }}
          errorMessage={error}
          isInvalid={!!error}
        />
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        classNames={{
          base: "bg-[#18181b] border border-zinc-800 text-white",
          header: "border-b border-zinc-800",
          footer: "border-t border-zinc-800",
          closeButton: "hover:bg-zinc-800 active:bg-zinc-700",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Select Date & Time
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Calendar Section */}
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        onClick={handlePrevMonth}
                        size="sm"
                        variant="light"
                        isIconOnly
                        className="text-white hover:bg-zinc-800"
                      >
                        <ChevronLeft size={20} />
                      </Button>
                      <h2 className="text-lg font-semibold text-white">
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
                        size="sm"
                        variant="light"
                        isIconOnly
                        className="text-white hover:bg-zinc-800"
                      >
                        <ChevronRight size={20} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {daysOfWeek.map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-gray-500 py-1"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 relative min-h-[200px]">
                      {loading && (
                        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center rounded-lg">
                          <Spinner size="sm" color="white" />
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
                                  ? "bg-zinc-800 text-white border border-zinc-600"
                                  : "text-gray-300 hover:bg-zinc-800",
                              disabled &&
                                "opacity-30 cursor-not-allowed hover:bg-transparent text-zinc-600",
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot Selection Section */}
                  <div className="border-l border-zinc-800 pl-6 flex flex-col">
                    <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock size={18} />
                      Available Slots
                    </h3>

                    {!date
                      ? <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic">
                          Select a date to view slots
                        </div>
                      : <div className="space-y-3">
                          <p className="text-sm text-gray-400 mb-2">
                            For {new Date(date).toLocaleDateString()}
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            {TIME_SLOTS.map((timeSlot) => {
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
                                    "px-4 py-3 rounded-xl border text-sm font-medium transition-all flex justify-between items-center w-full",
                                    isSelectedSlot
                                      ? "bg-white text-black border-white"
                                      : "bg-[#272727] text-gray-300 border-zinc-700 hover:border-zinc-500",
                                    !isAvailable &&
                                      "opacity-50 cursor-not-allowed hover:border-zinc-700 bg-[#1a1a1a] text-zinc-600",
                                  )}
                                >
                                  <span>{timeSlot.label}</span>
                                  {!isAvailable && (
                                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-gray-400">
                                      Unavailable
                                    </span>
                                  )}
                                  {isSelectedSlot && (
                                    <span className="w-2 h-2 rounded-full bg-black"></span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  className="bg-white text-black font-semibold"
                  onPress={onClose}
                  isDisabled={!date || !slot}
                >
                  Confirm Selection
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
