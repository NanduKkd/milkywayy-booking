import { fireEvent, render, screen } from "@testing-library/react";
import NewNavbar from "../NewNavbar";

const mockPush = jest.fn();
const mockUsePathname = jest.fn();
const mockUseAuth = jest.fn();

jest.mock(
  "next/dynamic",
  () => () =>
    function MockDynamicComponent() {
      return null;
    },
);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockUsePathname(),
}));

jest.mock("@/lib/contexts/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("NewNavbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
    mockUseAuth.mockReturnValue({
      authState: { isAuthenticated: false },
      login: jest.fn(),
      logout: jest.fn(),
    });
  });

  it("shows Login instead of Book Now on /booking for logged-out users", () => {
    mockUsePathname.mockReturnValue("/booking");

    render(<NewNavbar />);

    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Book Now" }),
    ).not.toBeInTheDocument();
  });

  it("shows the user greeting instead of Book Now on /booking for authenticated users", () => {
    mockUsePathname.mockReturnValue("/booking");
    mockUseAuth.mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: { fullName: "Jane Doe", email: "jane@example.com" },
      },
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<NewNavbar />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Book Now" }),
    ).not.toBeInTheDocument();
  });

  it("opens login when the /booking Login CTA is clicked", () => {
    const login = jest.fn();
    mockUsePathname.mockReturnValue("/booking");
    mockUseAuth.mockReturnValue({
      authState: { isAuthenticated: false },
      login,
      logout: jest.fn(),
    });

    render(<NewNavbar />);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(login).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
