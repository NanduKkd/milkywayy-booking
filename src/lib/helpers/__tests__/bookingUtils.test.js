import {
  calculateBookingDuration,
  getAvailableSlots,
  getBookingLoadBreakdown,
} from "../bookingUtils";

describe("calculateBookingDuration", () => {
  it("should return deterministic slots from weight model", () => {
    const service = {
      id: ["Photography", "Videography"],
      videographySubService: "Long Form.Daylight + Night",
    };
    const propertyDetails = {
      size: "Studio",
      type: "Apartment",
      videographySubService: "Long Form.Daylight + Night",
    };
    const location = { city: "Dubai" };

    const duration = calculateBookingDuration(
      service,
      propertyDetails,
      location,
    );
    expect(duration).toBe(1);
    expect(Number.isInteger(duration)).toBe(true);
  });

  it("should fallback to 1 when required values are missing", () => {
    const duration = calculateBookingDuration({}, {}, {});
    expect(duration).toBe(1);
  });

  it("should accept three arguments", () => {
    expect(calculateBookingDuration.length).toBe(3);
  });
});

describe("getAvailableSlots", () => {
  // Helpers to create Date objects for today at specific hours/minutes
  const getTodayAt = (hour, minute = 0) => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  it("should generate 30-minute slots from 10:00 to 18:00", () => {
    const slots = getAvailableSlots(new Date(), 1, []);
    // 10:00, 10:30 ... 17:30 (18:00 is end of work day, so last start time for >0 duration is before 18:00)
    // Actually, if we list all "slots" regardless of validity, we might list 10:00 to 17:30.
    // 10:00 to 18:00 is 8 hours. 16 slots.
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].time).toBe("10:00");
  });

  it("should mark slots as unavailable if they exceed 18:00 based on duration", () => {
    // Duration 2 hours. 16:30 + 2h = 18:30 > 18:00. Should be unavailable.
    const slots = getAvailableSlots(new Date(), 2, []);
    const lateSlot = slots.find((s) => s.time === "16:30");
    expect(lateSlot.available).toBe(false);
    expect(lateSlot.reason).toMatch(/exceeds/i);

    // 16:00 + 2h = 18:00. Should be available.
    const validSlot = slots.find((s) => s.time === "16:00");
    expect(validSlot.available).toBe(true);
  });

  it("should mark slots as unavailable if they overlap with existing bookings", () => {
    // Existing booking: 12:00 - 14:00 (2 hours)
    const existingBookings = [{ startTime: getTodayAt(12, 0), duration: 2 }];

    // User wants 2h duration.
    // 11:00 starts. Ends 13:00. Overlaps 12:00-13:00.
    const slots = getAvailableSlots(new Date(), 2, existingBookings);

    const overlapSlot = slots.find((s) => s.time === "11:00");
    expect(overlapSlot.available).toBe(false);
    expect(overlapSlot.reason).toMatch(/overlap/i);

    // 10:00 starts. Ends 12:00. No overlap (assuming touching is fine).
    const touchingSlot = slots.find((s) => s.time === "10:00");
    expect(touchingSlot.available).toBe(true);
  });
});

describe("getBookingLoadBreakdown", () => {
  it("uses apartment 5 bed weight alias correctly", () => {
    const breakdown = getBookingLoadBreakdown({
      propertyType: "Apartment",
      propertySize: "5 Bed",
      services: ["Photography"],
      videographySubService: "",
    });

    expect(breakdown.propertyWeight).toBe(3.5);
    expect(breakdown.serviceWeightSum).toBe(1);
    expect(breakdown.slotsRequired).toBe(1);
  });

  it("uses villa 7 bed weight alias correctly", () => {
    const breakdown = getBookingLoadBreakdown({
      propertyType: "Villa/Townhouse",
      propertySize: "7 Bed",
      services: ["Photography", "Videography"],
      videographySubService: "Long Form.Daylight + Night",
    });

    expect(breakdown.propertyWeight).toBe(5.5);
    expect(breakdown.serviceWeightSum).toBe(4);
    expect(breakdown.totalLoad).toBe(9.5);
    expect(breakdown.slotsRequired).toBe(2);
  });
});
