import { render, screen } from "../../../test-utils";
import AdminDashboard from "../page";

describe("AdminDashboard", () => {
  it("links operators to Promotions and Calendar instead of legacy Discounts or Coupons", () => {
    render(<AdminDashboard />);

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
