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
        bookingReferences: ["MWY-000001", "MWY-000002"],
        totalPaidAmount: 1250,
        bookingSummaries: [
          {
            bookingReference: "MWY-000001",
            propertyTitle: "2 Bed Apartment - Dubai Marina",
            location: "1204, Marina Gate, Dubai Marina",
            services: "Photography, Videography",
            arrivalWindow: "17 Mar 2026 · 09:00",
            deliveryTimeline: "Photos delivered within 24h",
            amount: 600,
          },
          {
            bookingReference: "MWY-000002",
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

    expect(screen.getByText(/booking ids:/i)).toBeInTheDocument();
    expect(screen.getByText("MWY-000001, MWY-000002")).toBeInTheDocument();
    expect(
      screen.getAllByText("2 Bed Apartment - Dubai Marina").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Villa - Palm Jumeirah").length).toBeGreaterThan(0);
    expect(screen.getByText(/total paid/i)).toBeInTheDocument();
    expect(screen.getByText("AED 1,250.00")).toBeInTheDocument();
  });
});
