import { fireEvent, render, screen } from "@testing-library/react";
import { PaymentStep } from "../PaymentStep";

describe("PaymentStep", () => {
  const mockProperties = [
    {
      community: "Downtown",
      propertyType: "Apartment",
      building: "Burj Khalifa",
      unitNumber: "101",
      propertySize: "1BR",
      preferredDate: "2023-12-25",
      timeSlot: "Morning",
      services: ["Photo"],
      contactName: "John Doe",
      contactPhone: "+1234567890",
    },
  ];

  const defaultProps = {
    properties: mockProperties,
    onBack: jest.fn(),
    getPropertyPrice: jest.fn(() => 500),
    calculateTotal: jest.fn(() => 500),
    appliedAutoDiscounts: [],
    discountAmount: 0,
    amountAfterAuto: 500,
    autoWalletCredits: 0,
    couponCode: "",
    setCouponCode: jest.fn(),
    handleApplyCoupon: jest.fn(),
    couponError: "",
    couponSuccess: "",
    handleFinalSubmit: jest.fn(),
    isProcessingPayment: false,
  };

  it("renders property details correctly", () => {
    render(<PaymentStep {...defaultProps} />);
    expect(screen.getByText(/Downtown - Apartment/i)).toBeInTheDocument();
    expect(screen.getByText(/Burj Khalifa - 101/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AED 500/i).length).toBeGreaterThan(0);
  });

  it("renders order summary correctly", () => {
    render(<PaymentStep {...defaultProps} />);
    expect(screen.getByText(/Total Payable/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AED 500/i).length).toBeGreaterThan(0);
  });

  it("calls handleFinalSubmit when Make Payment is clicked", () => {
    render(<PaymentStep {...defaultProps} />);
    const button = screen.getByRole("button", { name: /Make Payment/i });
    fireEvent.click(button);
    expect(defaultProps.handleFinalSubmit).toHaveBeenCalled();
  });

  it("shows loading state when isProcessingPayment is true", () => {
    render(<PaymentStep {...defaultProps} isProcessingPayment={true} />);
    expect(screen.getByText(/Processing.../i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Processing.../i }),
    ).toBeDisabled();
  });

  it("calls onBack when back button is clicked", () => {
    render(<PaymentStep {...defaultProps} />);
    const backButton = screen.getByText(/Back to Details/i);
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
