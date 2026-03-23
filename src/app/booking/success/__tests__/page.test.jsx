import { render, screen } from "../../../../test-utils";
import BookingSuccessPage from "../page";
import { verifyStripeSession } from "@/lib/actions/bookings";

jest.mock("@/lib/actions/bookings", () => ({
  verifyStripeSession: jest.fn(),
}));

describe("BookingSuccessPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all booking summaries from the wrapped verification response", async () => {
    verifyStripeSession.mockResolvedValue({
      success: true,
      message: null,
      data: {
        message: "Payment verified and bookings confirmed",
        paymentVerified: true,
        bookingReferences: ["MWB-1001", "MWB-1002"],
        totalPaidAmount: 1250,
        bookingSummaries: [
          {
            bookingReference: "MWB-1001",
            propertyTitle: "2 Bed Apartment - Dubai Marina",
            location: "1204, Marina Gate, Dubai Marina",
            services: "Photography, Videography - Short Form",
            arrivalWindow: "17 Mar 2026 · 09:00",
            deliveryTimeline: "Photos delivered within 24h",
            amount: 600,
          },
          {
            bookingReference: "MWB-1002",
            propertyTitle: "Villa - Palm Jumeirah",
            location: "Frond A, Palm Jumeirah",
            services: "360° Tour",
            arrivalWindow: "18 Mar 2026 · 13:00",
            deliveryTimeline: "360° tour delivered within 48-72h",
            amount: 650,
          },
        ],
      },
    });

    const page = await BookingSuccessPage({
      searchParams: Promise.resolve({ session_id: "cs_test_123" }),
    });

    render(page);

    expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/your bookings \(2\)/i)).toBeInTheDocument();
    expect(
      screen.getAllByText("2 Bed Apartment - Dubai Marina").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Villa - Palm Jumeirah").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Booking ID:")).toHaveLength(2);
    expect(screen.getByText("MWB-1001")).toBeInTheDocument();
    expect(screen.getByText("MWB-1002")).toBeInTheDocument();
    expect(screen.getByText("AED 600")).toBeInTheDocument();
    expect(screen.getByText("AED 650")).toBeInTheDocument();
    expect(screen.getByText("1204, Marina Gate, Dubai Marina")).toBeInTheDocument();
    expect(screen.getByText("Photography, Videography - Short Form")).toBeInTheDocument();
    expect(screen.getByText("Frond A, Palm Jumeirah")).toBeInTheDocument();
    expect(screen.getByText("360° Tour")).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Afternoon")).toBeInTheDocument();
    expect(screen.getByText("Arrival 09:00 - 09:30")).toBeInTheDocument();
    expect(screen.getByText("Arrival 13:00 - 13:30")).toBeInTheDocument();
  });

  it("shows a pending state when the session has not been paid yet", async () => {
    verifyStripeSession.mockResolvedValue({
      success: true,
      message: null,
      data: {
        message: "Payment is still processing. Please refresh in a few seconds.",
        paymentVerified: false,
        bookingSummary: null,
        bookingSummaries: [],
        bookingReferences: [],
        totalPaidAmount: 0,
      },
    });

    const page = await BookingSuccessPage({
      searchParams: Promise.resolve({ session_id: "cs_test_pending" }),
    });

    render(page);

    expect(screen.getByText(/confirmation pending/i)).toBeInTheDocument();
    expect(
      screen.getByText(/payment is still processing\. please refresh in a few seconds\./i),
    ).toBeInTheDocument();
  });
});
