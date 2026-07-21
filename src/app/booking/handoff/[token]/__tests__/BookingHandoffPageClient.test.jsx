import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BookingHandoffPageClient from "../BookingHandoffPageClient";

jest.mock("@/app/booking/BookNew", () => ({
  SharedBookingForm: ({
    discounts,
    initialProperties,
    mode,
    previewPricing,
    submitBooking,
  }) => (
    <div data-testid="shared-booking-form" data-booking-mode={mode}>
      <output data-testid="shared-property-count">
        {initialProperties.length}
      </output>
      <output data-testid="shared-contact-name">
        {initialProperties[0]?.contactName || ""}
      </output>
      <output data-testid="shared-discount-count">{discounts.length}</output>
      <button
        type="button"
        onClick={() => previewPricing(820, "SYNTHETIC10", initialProperties)}
      >
        Preview shared pricing
      </button>
      <button
        type="button"
        onClick={() =>
          submitBooking({
            properties: initialProperties,
            promotionCode: "SYNTHETIC10",
          })
        }
      >
        Submit shared form
      </button>
    </div>
  ),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ disabled, onChange, value }) => (
    <input
      aria-label="Verification code"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  ),
  InputOTPGroup: ({ children }) => <div>{children}</div>,
  InputOTPSlot: () => null,
}));

const HANDOFF = {
  requiresRegistration: true,
  registrationVerifiedAt: null,
  customer: {
    accountType: "INDIVIDUAL",
    fullName: "Sample Customer",
    companyName: "",
    phone: "+971501234567",
    billingAddress: "",
    email: "sample@example.test",
    trn: "",
  },
  properties: [],
};

const REVIEW_HANDOFF = {
  transactionId: 61,
  paymentStatus: "pending",
  isExpired: false,
  requiresRegistration: false,
  registrationVerifiedAt: "2026-07-21T12:00:00.000Z",
  customer: HANDOFF.customer,
  properties: [
    {
      propertyType: "Apartment",
      propertySize: "2 Bed",
      services: ["Photography"],
      videographySubService: "",
      preferredDate: "2026-08-04",
      timeSlot: "morning",
      startTime: "10:00",
      duration: 2,
      building: "Synthetic Tower",
      community: "Test District",
      unitNumber: "1402",
    },
  ],
};

function jsonResponse(payload) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(payload),
  };
}

describe("BookingHandoffPageClient OTP verification", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(HANDOFF));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function sendOtp() {
    render(<BookingHandoffPageClient token="synthetic-handoff-token" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Send verification code" }),
    );

    await screen.findByText(/Code sent to \+971501234567/i);
  }

  it("locks customer details after sending a verification code", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(HANDOFF))
      .mockResolvedValueOnce(
        jsonResponse({ verificationId: "verification-1" }),
      );

    await sendOtp();

    expect(screen.getByLabelText("Account type")).toBeDisabled();
    expect(screen.getByLabelText("Phone")).toBeDisabled();
    expect(screen.getByLabelText("Full name")).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Verification code")).toBeEnabled();
    expect(
      screen.getByText(/Your details are locked while this code is active/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("shared-booking-form")).not.toBeInTheDocument();
  });

  it("clears the client OTP attempt when the customer changes details", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(HANDOFF))
      .mockResolvedValueOnce(
        jsonResponse({ verificationId: "verification-1" }),
      );

    await sendOtp();
    fireEvent.click(screen.getByRole("button", { name: "Change details" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Send verification code" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByLabelText("Verification code"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeEnabled();
    expect(screen.getByLabelText("Full name")).toBeEnabled();
  });

  it("shows a disabled resend action during the cooldown", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(HANDOFF))
      .mockResolvedValueOnce(
        jsonResponse({ verificationId: "verification-1" }),
      );

    await sendOtp();

    expect(
      screen.getByRole("button", { name: "Resend code in 30s" }),
    ).toBeDisabled();
  });

  it("renders the shared form for a verified handoff and submits to the token endpoint", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(REVIEW_HANDOFF))
      .mockResolvedValueOnce(jsonResponse({ url: "#synthetic-payment" }));

    render(
      <BookingHandoffPageClient
        token="synthetic-handoff-token"
        pricingConfig={{}}
        discounts={[{ id: "wallet-synthetic" }]}
      />,
    );

    const sharedForm = await screen.findByTestId("shared-booking-form");
    expect(sharedForm).toHaveAttribute("data-booking-mode", "handoff");
    expect(screen.getByTestId("shared-property-count")).toHaveTextContent("1");
    expect(screen.getByTestId("shared-contact-name")).toHaveTextContent(
      "Sample Customer",
    );
    expect(screen.getByTestId("shared-discount-count")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Submit shared form" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(global.fetch.mock.calls[1][0]).toBe(
      "/api/booking-handoffs/synthetic-handoff-token/checkout",
    );
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual(
      expect.objectContaining({
        properties: [
          expect.objectContaining({
            propertyType: "Apartment",
            building: "Synthetic Tower",
            contactName: "Sample Customer",
          }),
        ],
        promotionCode: "SYNTHETIC10",
      }),
    );
  });

  it("previews handoff promotions through the token-scoped endpoint", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(REVIEW_HANDOFF))
      .mockResolvedValueOnce(
        jsonResponse({
          eligibleSubtotal: 820,
          selectedPromotion: {
            promotionId: 44,
            kind: "PERSONAL",
            benefitAmount: 125,
          },
        }),
      );

    render(
      <BookingHandoffPageClient
        token="synthetic-handoff-token"
        pricingConfig={{}}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Preview shared pricing" }),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(global.fetch.mock.calls[1][0]).toBe(
      "/api/booking-handoffs/synthetic-handoff-token/promotion-preview",
    );
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      eligibleSubtotal: 820,
      promotionCode: "SYNTHETIC10",
    });
  });

  it.each([
    [
      "expired",
      { ...REVIEW_HANDOFF, isExpired: true },
      /This secure link has expired/i,
    ],
    [
      "already paid",
      { ...REVIEW_HANDOFF, paymentStatus: "success" },
      /already been completed/i,
    ],
  ])(
    "keeps the %s status outside the shared form",
    async (_, payload, copy) => {
      global.fetch.mockResolvedValueOnce(jsonResponse(payload));

      render(<BookingHandoffPageClient token="synthetic-handoff-token" />);

      expect(await screen.findByText(copy)).toBeInTheDocument();
      expect(
        screen.queryByTestId("shared-booking-form"),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps invalid and superseded link errors outside the shared form", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: "This booking handoff link is no longer active",
      }),
    });

    render(<BookingHandoffPageClient token="synthetic-handoff-token" />);

    expect(
      await screen.findByText("This booking handoff link is no longer active"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("shared-booking-form")).not.toBeInTheDocument();
  });
});
