import {
  calculateBookingDuration,
  getAvailableSlots,
} from "./src/lib/helpers/bookingUtils.js";

console.log("--- Manual Verification for Phase 1 ---");

console.log("\n1. Testing calculateBookingDuration:");
const duration = calculateBookingDuration({}, {}, {});
console.log(`   Result: ${duration} hours`);
if (duration >= 3 && duration <= 8) {
  console.log("   ✅ Duration is within valid range (3-8)");
} else {
  console.log("   ❌ Duration is OUT of range");
}

console.log("\n2. Testing getAvailableSlots (Duration: 2h):");
const slots = getAvailableSlots(new Date(), 2, []);
console.log(`   Generated ${slots.length} slots.`);

const firstSlot = slots.find((s) => s.time === "10:00");
const lastValidSlot = slots.find((s) => s.time === "16:00"); // 16:00 + 2h = 18:00
const invalidSlot = slots.find((s) => s.time === "16:30"); // 16:30 + 2h = 18:30

if (firstSlot?.available) {
  console.log("   ✅ 10:00 is available");
} else {
  console.log("   ❌ 10:00 check failed");
}

if (lastValidSlot?.available) {
  console.log("   ✅ 16:00 is available (ends at 18:00)");
} else {
  console.log("   ❌ 16:00 check failed");
}

if (invalidSlot && !invalidSlot.available) {
  console.log("   ✅ 16:30 is unavailable (ends after 18:00)");
} else {
  console.log("   ❌ 16:30 check failed");
}
