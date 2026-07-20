import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminHeader from "../AdminHeader";

const mockPush = jest.fn();
const mockLogout = jest.fn();
const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => mockUsePathname(),
}));

jest.mock("@/lib/contexts/auth", () => ({
  useAuth: () => ({
    authState: {
      user: {
        fullName: "Milky Way Ops",
        email: "ops@milkywayy.com",
        role: "SUPERADMIN",
      },
    },
    logout: mockLogout,
  }),
}));

describe("AdminHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
    mockUsePathname.mockReturnValue("/admin");
  });

  it("opens a mobile drawer with grouped navigation", () => {
    render(<AdminHeader />);

    expect(screen.getByText("Milky Way Ops")).toBeInTheDocument();
    expect(screen.getByText("SUPERADMIN")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open navigation/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("MILKYWAYY")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Customers/i })).toHaveAttribute(
      "href",
      "/admin/users",
    );
    expect(screen.getAllByText("Workspace")).toHaveLength(2);
    expect(screen.getByText("Milky Way Ops")).toBeInTheDocument();
  });

  it("logs out and returns to admin login", async () => {
    render(<AdminHeader />);

    fireEvent.click(screen.getByRole("button", { name: /Log Out/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });
  });
});
