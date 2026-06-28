import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock server actions
jest.mock("./src/lib/actions/auth", () => ({
  logout: jest.fn(),
  login: jest.fn(),
}));

// Mock Next.js Navigation
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock bookings actions
jest.mock("./src/lib/actions/bookings", () => ({
  cancelBooking: jest.fn(),
  getBookings: jest.fn(),
  getDrafts: jest.fn(),
  saveDrafts: jest.fn(),
  createTransactionAndPaymentIntent: jest.fn(),
  verifyStripeSession: jest.fn(),
  rescheduleBookingByCode: jest.fn(),
  updateBookingWorkflow: jest.fn(),
  completeDeliveredBooking: jest.fn(),
  requestBookingRevision: jest.fn(),
  requestFileRevision: jest.fn(),
  finishBookingDelivery: jest.fn(),
}));

// Mock discounts actions
jest.mock("./src/lib/actions/discounts", () => ({
  getDiscounts: jest.fn(),
  saveDiscounts: jest.fn(),
}));

// Mock coupons actions
jest.mock("./src/lib/actions/coupons", () => ({
  getCoupons: jest.fn(),
  createCoupon: jest.fn(),
  toggleCouponStatus: jest.fn(),
  deleteCoupon: jest.fn(),
  validateCoupon: jest.fn(),
}));
