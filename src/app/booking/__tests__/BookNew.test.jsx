import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { PRICING_CONFIG } from "@/lib/config/pricing";
import BookNew from "../BookNew";

// Mocks
jest.mock("../../../lib/contexts/auth", () => ({
  useAuth: jest.fn(() => ({
    authState: { isAuthenticated: true },
    login: jest.fn(),
  })),
}));

jest.mock("../../../lib/actions/bookings", () => ({
  createBookings: jest.fn(() => Promise.resolve({ success: true, data: [1] })),
  createTransactionAndPaymentIntent: jest.fn(() =>
    Promise.resolve({ success: true, data: { url: "http://test.com" } }),
  ),
  getDrafts: jest.fn(() => Promise.resolve({ success: true, data: [] })),
  previewPromotionPricing: jest.fn((amount, code = "") => {
    const subtotal = Number(amount || 0);
    const normalizedCode = String(code || "")
      .trim()
      .toUpperCase();
    let selectedPromotion = null;
    let codeValidation = null;

    if (normalizedCode === "SAVE10") {
      selectedPromotion = {
        promotionId: 9,
        code: "SAVE10",
        name: "SAVE10",
        kind: "GENERIC",
        benefitAmount: 50,
      };
      codeValidation = {
        status: "APPLIED",
        message: "SAVE10 applied successfully",
      };
    } else if (subtotal >= 1000) {
      selectedPromotion = {
        promotionId: 2,
        name: "First-Shoot Launch Credit",
        kind: "AUTOMATIC",
        benefitAmount: 500,
      };
    } else if (subtotal >= 449) {
      selectedPromotion = {
        promotionId: 1,
        name: "First-Shoot Launch Credit",
        kind: "AUTOMATIC",
        benefitAmount: 250,
      };
    }

    return Promise.resolve({
      success: true,
      data: {
        eligibleSubtotal: subtotal,
        enteredCode: normalizedCode,
        selectedPromotion,
        codeValidation,
      },
    });
  }),
  saveDrafts: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../lib/helpers/bookingUtils", () => ({
  calculateBookingDuration: jest.fn(() => 5),
  getAvailableSlots: jest.fn(() => []),
  getBookingArrivalWindowFromDetails: jest.fn(() => ""),
  getBookingStartTime: jest.fn(({ startTime, slot }) => {
    if (startTime) return startTime;
    if (slot === "morning") return "09:00";
    if (slot === "afternoon") return "13:00";
    if (slot === "evening") return "17:00";
    return "";
  }),
}));

jest.mock(
  "../../../components/StarBackground",
  () =>
    function StarBackground() {
      return <div data-testid="star-background" />;
    },
);

jest.mock("../components/PropertyCard", () => ({
  PropertyCard: ({
    index,
    onRemove,
    updatePropertyField,
    toggleService,
    property,
  }) => {
    return (
      <div data-testid={`property-card-${index}`}>
        <input
          data-testid={`type-${index}`}
          onChange={(e) =>
            updatePropertyField(index, "propertyType", e.target.value)
          }
        />
        <input
          data-testid={`size-${index}`}
          onChange={(e) =>
            updatePropertyField(index, "propertySize", e.target.value)
          }
        />
        <button
          type="button"
          data-testid={`set-date-${index}`}
          onClick={() =>
            updatePropertyField(index, "preferredDate", "2026-04-01")
          }
        >
          Set Date
        </button>
        <button
          type="button"
          data-testid={`set-time-${index}`}
          onClick={() => updatePropertyField(index, "startTime", "10:00")}
        >
          Set Time
        </button>
        <button
          type="button"
          data-testid={`add-service-${index}`}
          onClick={() =>
            updatePropertyField(index, "services", ["Photography"])
          }
        >
          Add Service
        </button>
        <button
          type="button"
          data-testid={`toggle-service-${index}`}
          onClick={() =>
            toggleService(index, "Photography", property.services || [])
          }
        >
          Toggle Service
        </button>
        <button
          type="button"
          data-testid={`toggle-videography-${index}`}
          onClick={() =>
            toggleService(index, "Videography", property.services || [])
          }
        >
          Toggle Videography
        </button>
        <button
          type="button"
          data-testid={`set-videography-option-${index}`}
          onClick={() =>
            updatePropertyField(
              index,
              "videographySubService",
              "Long Form.Daylight",
            )
          }
        >
          Set Videography Option
        </button>
        <div data-testid={`date-${index}`}>{property.preferredDate}</div>
        <div data-testid={`time-${index}`}>{property.startTime}</div>
        <div data-testid={`duration-${index}`}>{property.duration}</div>
        <div data-testid={`videography-subservice-${index}`}>
          {property.videographySubService}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          data-testid={`remove-${index}`}
        >
          Remove
        </button>
      </div>
    );
  },
}));

jest.mock("../components/PaymentStep", () => ({
  PaymentStep: ({ onBack, handleFinalSubmit }) => (
    <div data-testid="payment-step">
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={handleFinalSubmit}>
        Pay
      </button>
    </div>
  ),
}));

jest.mock("../components/PricingSummary", () => ({
  PricingSummary: ({ totalAmount }) => (
    <div data-testid="pricing-summary">Total: {totalAmount}</div>
  ),
}));

// Helper to create a promise that behaves like a resolved resource for React.use
const createFulfilledPromise = (data) => {
  const promise = Promise.resolve(data);
  promise.status = "fulfilled";
  promise.value = data;
  return promise;
};

describe("BookNew", () => {
  const mockPricingsPromise = createFulfilledPromise({
    success: true,
    data: PRICING_CONFIG,
  });
  const mockDiscountsPromise = createFulfilledPromise({
    success: true,
    data: [],
  });
  const createPricingPromise = (price) =>
    createFulfilledPromise({
      success: true,
      data: {
        Apartment: {
          sizes: [
            {
              label: "2 Bed",
              prices: {
                Photography: { price, slots: 1 },
              },
            },
          ],
        },
      },
    });

  beforeEach(() => {
    const { useAuth } = require("../../../lib/contexts/auth");
    useAuth.mockReturnValue({
      authState: { isAuthenticated: true },
      login: jest.fn(),
    });
  });

  it("renders correctly and loads drafts", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={mockPricingsPromise}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    // Initial render should show one property card (default)
    await waitFor(() => {
      expect(screen.getByTestId("property-card-0")).toBeInTheDocument();
    });

    expect(screen.getByText(/Book Your Shoot/i)).toBeInTheDocument();
  });

  it("adds a new property", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={mockPricingsPromise}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("property-card-0")).toBeInTheDocument(),
    );

    const addButton = screen.getByTestId("add-property");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId("property-card-1")).toBeInTheDocument();
    });
  });

  it("removes a property", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={mockPricingsPromise}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("property-card-0")).toBeInTheDocument(),
    );

    // Add a second property first (cannot remove if only 1)
    fireEvent.click(screen.getByTestId("add-property"));
    await waitFor(() =>
      expect(screen.getByTestId("property-card-1")).toBeInTheDocument(),
    );

    // Remove the second property
    fireEvent.click(screen.getByTestId("remove-1"));

    await waitFor(() => {
      expect(screen.queryByTestId("property-card-1")).not.toBeInTheDocument();
    });
  });

  it("updates duration when property details change", async () => {
    const {
      calculateBookingDuration,
    } = require("../../../lib/helpers/bookingUtils");
    calculateBookingDuration.mockReturnValue(7);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={mockPricingsPromise}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("property-card-0")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Villa" },
    });
    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "4 Bedroom" },
    });
    fireEvent.click(screen.getByTestId("add-service-0"));

    await waitFor(() => {
      expect(screen.getByTestId("duration-0")).toHaveTextContent("7");
    });
    expect(calculateBookingDuration).toHaveBeenCalled();
  });

  it("selects Short Form by default when videography is selected", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={mockPricingsPromise}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("property-card-0")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("toggle-videography-0"));

    await waitFor(() => {
      expect(screen.getByTestId("videography-subservice-0")).toHaveTextContent(
        "Short Form",
      );
    });

    fireEvent.click(screen.getByTestId("toggle-videography-0"));

    await waitFor(() => {
      expect(screen.getByTestId("videography-subservice-0")).toHaveTextContent(
        "",
      );
    });
  });

  it("resets date and time when service/type/size/videography changes", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={mockPricingsPromise}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("property-card-0")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("set-date-0"));
    fireEvent.click(screen.getByTestId("set-time-0"));

    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("2026-04-01");
      expect(screen.getByTestId("time-0")).toHaveTextContent("10:00");
    });

    fireEvent.click(screen.getByTestId("toggle-service-0"));
    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("");
      expect(screen.getByTestId("time-0")).toHaveTextContent("");
    });

    fireEvent.click(screen.getByTestId("set-date-0"));
    fireEvent.click(screen.getByTestId("set-time-0"));
    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("2026-04-01");
      expect(screen.getByTestId("time-0")).toHaveTextContent("10:00");
    });

    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "2 Bed" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("");
      expect(screen.getByTestId("time-0")).toHaveTextContent("");
    });

    fireEvent.click(screen.getByTestId("set-date-0"));
    fireEvent.click(screen.getByTestId("set-time-0"));
    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("2026-04-01");
      expect(screen.getByTestId("time-0")).toHaveTextContent("10:00");
    });

    fireEvent.click(screen.getByTestId("set-videography-option-0"));
    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("");
      expect(screen.getByTestId("time-0")).toHaveTextContent("");
    });

    fireEvent.click(screen.getByTestId("set-date-0"));
    fireEvent.click(screen.getByTestId("set-time-0"));
    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("2026-04-01");
      expect(screen.getByTestId("time-0")).toHaveTextContent("10:00");
    });

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Villa" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("date-0")).toHaveTextContent("");
      expect(screen.getByTestId("time-0")).toHaveTextContent("");
    });
  });

  it("allows entering and applying a promo code manually", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={mockPricingsPromise}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Enter promo code/i),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Apartment" },
    });
    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "2 Bed" },
    });
    fireEvent.click(screen.getByTestId("add-service-0"));

    fireEvent.change(screen.getByPlaceholderText(/Enter promo code/i), {
      target: { value: "SAVE10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Apply/i }));

    await waitFor(() => {
      expect(screen.getByText("Promo Code (SAVE10)")).toBeInTheDocument();
    });
  });

  it("auto-applies AED 250 launch credit at subtotal 450", async () => {
    const { useAuth } = require("../../../lib/contexts/auth");
    useAuth.mockReturnValue({
      authState: { isAuthenticated: false },
      login: jest.fn(),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={createPricingPromise(450)}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Apartment" },
    });
    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "2 Bed" },
    });
    fireEvent.click(screen.getByTestId("add-service-0"));

    await waitFor(() => {
      expect(screen.getAllByText("First-Shoot Launch Credit")).not.toHaveLength(
        0,
      );
    });

    expect(screen.getByText("- AED 250")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-booking-total")).toHaveTextContent(
      "AED 200",
    );
  });

  it("auto-applies AED 250 launch credit at subtotal 700", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={createPricingPromise(700)}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Apartment" },
    });
    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "2 Bed" },
    });
    fireEvent.click(screen.getByTestId("add-service-0"));

    await waitFor(() => {
      expect(screen.getByText("- AED 250")).toBeInTheDocument();
    });

    expect(screen.getByTestId("mobile-booking-total")).toHaveTextContent(
      "AED 450",
    );
  });

  it("keeps a single selected promotion at subtotal 820", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={createPricingPromise(820)}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Apartment" },
    });
    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "2 Bed" },
    });
    fireEvent.click(screen.getByTestId("add-service-0"));

    await waitFor(() => {
      expect(screen.getByText("- AED 250")).toBeInTheDocument();
    });

    expect(screen.getByTestId("mobile-booking-total")).toHaveTextContent(
      "AED 570",
    );
    expect(
      screen.queryByText(/unlock AED 500 off instead of AED 250/i),
    ).not.toBeInTheDocument();
  });

  it("auto-applies AED 500 launch credit at subtotal 1050", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={createPricingPromise(1050)}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Apartment" },
    });
    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "2 Bed" },
    });
    fireEvent.click(screen.getByTestId("add-service-0"));

    await waitFor(() => {
      expect(screen.getByText("- AED 500")).toBeInTheDocument();
    });

    const mobileTotal = screen.getByTestId("mobile-booking-total");
    expect(mobileTotal.querySelector(".line-through")).toHaveTextContent(
      "AED 1,050",
    );
    expect(mobileTotal.querySelector(".font-bold")).toHaveTextContent(
      "AED 550",
    );
    expect(screen.getByTestId("mobile-booking-footer")).toHaveTextContent(
      "First-Shoot Launch Credit",
    );
  });

  it("blocks payment below the AED 449 minimum order amount", async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BookNew
          pricingsPromise={createPricingPromise(400)}
          discountsPromise={mockDiscountsPromise}
        />
      </Suspense>,
    );

    fireEvent.change(screen.getByTestId("type-0"), {
      target: { value: "Apartment" },
    });
    fireEvent.change(screen.getByTestId("size-0"), {
      target: { value: "2 Bed" },
    });
    fireEvent.click(screen.getByTestId("add-service-0"));

    await waitFor(() => {
      expect(
        screen.getByText("Minimum order value is AED 449"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("mobile-booking-footer")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-booking-total")).toHaveTextContent(
      "AED 400",
    );
    expect(screen.getByTestId("mobile-continue")).toBeDisabled();
  });
});
