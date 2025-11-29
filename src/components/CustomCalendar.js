"use client";
import { useState } from "react";
import { Button } from "@heroui/react";

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
    <div className="w-full max-w-md mx-auto bg-[#18181b] border border-zinc-800 rounded-lg shadow-lg p-4 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Button
          onClick={handlePrevMonth}
          size="sm"
          variant="light"
          className="w-8 h-8 p-0 text-white hover:bg-zinc-800"
        >
          ‹
        </Button>
        <h2 className="text-lg font-semibold">
          {new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <Button
          onClick={handleNextMonth}
          size="sm"
          variant="light"
          className="w-8 h-8 p-0 text-white hover:bg-zinc-800"
        >
          ›
        </Button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-400 py-2"
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
            className={`w-8 h-8 text-sm rounded-full hover:bg-zinc-700 disabled:hover:bg-transparent disabled:text-zinc-600 ${
              isSelected(day)
                ? "bg-white text-black hover:bg-gray-200"
                : isToday(day)
                  ? "bg-zinc-800 text-white border border-zinc-600"
                  : "text-gray-300"
            }`}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
