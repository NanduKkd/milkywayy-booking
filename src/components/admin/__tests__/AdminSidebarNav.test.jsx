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

  it("shows Promotions and Calendar in primary navigation and removes Discounts and Coupons", () => {
    render(<AdminSidebarNav />);

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
});
