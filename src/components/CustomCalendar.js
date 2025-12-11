"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CustomCalendar({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (month, year) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDay = date.getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
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
    if (day) {
      const date = new Date(currentYear, currentMonth, day);
      if (minDate && date < minDate) return;
      if (maxDate && date > maxDate) return;
      onDateChange(date);
    }
  };

  const isSelected = (day) => {
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

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border rounded-lg shadow-lg p-4 text-card-foreground">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Button
          onClick={handlePrevMonth}
          size="icon"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <Button
          onClick={handleNextMonth}
          size="icon"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(day)}
            disabled={
              !day ||
              (minDate && new Date(currentYear, currentMonth, day) < minDate) ||
              (maxDate && new Date(currentYear, currentMonth, day) > maxDate)
            }
            className={`w-8 h-8 text-sm rounded-full flex items-center justify-center transition-colors
              ${!day ? "invisible" : ""}
              ${isSelected(day)
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : isToday(day)
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }
              disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed
            `}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
