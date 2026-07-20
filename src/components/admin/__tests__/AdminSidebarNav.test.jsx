import { render, screen } from "../../../test-utils";
import AdminSidebarNav from "../AdminSidebarNav";

const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => mockUsePathname(),
}));

describe("AdminSidebarNav", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/admin/promotions");
  });

  it("groups the live admin routes and labels /admin/users as Customers", () => {
    render(<AdminSidebarNav />);

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Customers/i })).toHaveAttribute(
      "href",
      "/admin/users",
    );
    expect(screen.getByRole("link", { name: /Reports/i })).toHaveAttribute(
      "href",
      "/admin/analytics",
    );
    expect(screen.getByRole("link", { name: /Promotions/i })).toHaveAttribute(
      "href",
      "/admin/promotions",
    );
    expect(screen.getByRole("link", { name: /Calendar/i })).toHaveAttribute(
      "href",
      "/admin/scheduling-calendar",
    );
    expect(
      screen.queryByRole("link", { name: /Discounts/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Coupons/i }),
    ).not.toBeInTheDocument();
  });

  it("marks the active link based on the current pathname", () => {
    mockUsePathname.mockReturnValue("/admin/bookings");
    render(<AdminSidebarNav />);

    const bookingsLink = screen.getByRole("link", { name: /Bookings/i });
    const customersLink = screen.getByRole("link", { name: /Customers/i });

    expect(bookingsLink).toHaveAttribute("aria-current", "page");
    expect(customersLink).not.toHaveAttribute("aria-current");
  });

  it("triggers onNavigate callback when a link is clicked", () => {
    const mockOnNavigate = jest.fn();
    render(<AdminSidebarNav onNavigate={mockOnNavigate} />);

    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    dashboardLink.click();

    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
  });

  it("applies mobile container styling when mobile is true", () => {
    mockUsePathname.mockReturnValue("/admin");
    const { container } = render(<AdminSidebarNav mobile={true} />);

    const mobileContainer = container.querySelector(
      ".rounded-xl.border-zinc-800",
    );
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer).toHaveClass("rounded-xl", "bg-zinc-900", "py-1");
  });
});
