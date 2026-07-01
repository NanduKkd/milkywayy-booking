import { render, screen } from "../../../test-utils";
import AdminDashboard from "../page";

describe("AdminDashboard", () => {
  it("links operators to Promotions instead of legacy Discounts or Coupons", () => {
    render(<AdminDashboard />);

    expect(screen.getByRole("link", { name: /Promotions/i })).toHaveAttribute(
      "href",
      "/admin/promotions",
    );
    expect(
      screen.queryByRole("link", { name: /Discounts/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Coupons/i }),
    ).not.toBeInTheDocument();
  });
});
