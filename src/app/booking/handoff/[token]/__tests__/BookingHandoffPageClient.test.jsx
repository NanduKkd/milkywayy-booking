import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BookingHandoffPageClient from "../BookingHandoffPageClient";

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
});
