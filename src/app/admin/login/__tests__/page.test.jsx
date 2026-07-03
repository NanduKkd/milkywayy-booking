import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import AdminLoginPage from "../page";

const mockPush = jest.fn();
const mockAdminLogin = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock("@/lib/actions/auth", () => ({
  adminLogin: (...args) => mockAdminLogin(...args),
}));

describe("AdminLoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminLogin.mockResolvedValue({ success: true, data: { id: 1 } });
  });

  it("renders the refreshed admin login shell", () => {
    render(<AdminLoginPage />);

    expect(
      screen.getByText(
        /Sign in to manage bookings, finances, operations, and content/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Admin Login/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it("shows validation errors for empty credentials", async () => {
    render(<AdminLoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /Login/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/password is required/i),
    ).toBeInTheDocument();
    expect(mockAdminLogin).not.toHaveBeenCalled();
  });

  it("submits valid credentials and redirects to /admin", async () => {
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "ops@milkywayy.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(mockAdminLogin).toHaveBeenCalledWith({
        email: "ops@milkywayy.com",
        password: "password123",
      });
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });

  it("surfaces login failures from the server action", async () => {
    mockAdminLogin.mockResolvedValue({
      success: false,
      message: "Access denied",
    });

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "customer@milkywayy.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Login/i }));

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
