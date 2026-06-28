import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardAccessGate from "../DashboardAccessGate";

const mockReplace = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/lib/contexts/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("DashboardAccessGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the shared login flow on mount and keeps a reopen CTA visible", async () => {
    const login = jest.fn();

    mockUseAuth.mockReturnValue({
      authState: { isAuthenticated: false },
      login,
    });

    render(<DashboardAccessGate nextPath="/dashboard/bookings" />);

    await waitFor(() => {
      expect(login).toHaveBeenCalledTimes(1);
    });

    const reopenButton = screen.getByRole("button", { name: "Sign In" });

    expect(reopenButton).toBeInTheDocument();

    fireEvent.click(reopenButton);

    expect(login).toHaveBeenCalledTimes(2);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("can skip the automatic modal open when requested", () => {
    const login = jest.fn();

    mockUseAuth.mockReturnValue({
      authState: { isAuthenticated: false },
      login,
    });

    render(
      <DashboardAccessGate
        nextPath="/dashboard/files?filter=ready"
        openOnMount={false}
      />,
    );

    expect(login).not.toHaveBeenCalled();
  });

  it("redirects authenticated users to the requested dashboard destination", async () => {
    const login = jest.fn();

    mockUseAuth.mockReturnValue({
      authState: { isAuthenticated: true },
      login,
    });

    render(<DashboardAccessGate nextPath="/dashboard/invoices" />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard/invoices");
    });

    expect(login).not.toHaveBeenCalled();
  });
});
