import { render, screen } from "@testing-library/react";
import AdminDashboard from "../page";

const mockGetSessionUser = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/helpers/auth", () => ({
  getSessionUser: (...args) => mockGetSessionUser(...args),
}));

jest.mock("../analytics/FinancialReportsPage", () => ({
  __esModule: true,
  default: function MockFinancialReportsPage({ mode }) {
    return <div data-mode={mode} data-testid="financial-reports-page" />;
  },
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects anonymous visitors to the admin login route", async () => {
    const { redirect } = await import("next/navigation");

    mockGetSessionUser.mockResolvedValue(null);

    await AdminDashboard();

    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("renders the dashboard-only analytics view for super admins", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });

    render(await AdminDashboard());

    expect(screen.getByTestId("financial-reports-page")).toHaveAttribute(
      "data-mode",
      "dashboard",
    );
  });
});
