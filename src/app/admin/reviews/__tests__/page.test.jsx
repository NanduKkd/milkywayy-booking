import { render, screen, waitFor } from "../../../../test-utils";
import ReviewsManagement from "../page";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
  })),
}));

jest.mock("../../../../lib/helpers/auth", () => ({
  getSessionUser: jest.fn(),
}));

jest.mock("@/lib/services/adminContent", () => ({
  listAdminReviews: jest.fn(),
}));

describe("Reviews Management Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("renders the refreshed reviews page after fetching data", async () => {
    const { getSessionUser } = require("../../../../lib/helpers/auth");
    const { listAdminReviews } = require("@/lib/services/adminContent");
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });
    listAdminReviews.mockResolvedValue([
      {
        id: 1,
        name: "Ava Client",
        role: "Agent",
        company: "Northline",
        rating: 5,
        source: "Google",
        featured: true,
        order: 0,
        isVisible: true,
      },
    ]);

    const page = await ReviewsManagement({
      searchParams: Promise.resolve({}),
    });
    render(page);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Reviews" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Ava Client")).toBeInTheDocument();
    });
  });

  it("shows a retryable unavailable state without misleading empty totals", async () => {
    const { getSessionUser } = require("../../../../lib/helpers/auth");
    const { listAdminReviews } = require("@/lib/services/adminContent");
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });
    listAdminReviews.mockRejectedValue(new Error("Reviews data unavailable"));

    const page = await ReviewsManagement({
      searchParams: Promise.resolve({}),
    });
    render(page);

    await waitFor(() => {
      expect(screen.getByText(/reviews are unavailable/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Reviews data unavailable/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /try again/i })).toHaveAttribute(
      "href",
      "/admin/reviews",
    );
    expect(screen.queryByText("Total reviews")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No featured reviews found"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("No standard reviews found"),
    ).not.toBeInTheDocument();
  });

  it("keeps the genuine empty-review state when the request succeeds", async () => {
    const { getSessionUser } = require("../../../../lib/helpers/auth");
    const { listAdminReviews } = require("@/lib/services/adminContent");
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });
    listAdminReviews.mockResolvedValue([]);

    const page = await ReviewsManagement();
    render(page);

    expect(
      screen.getByRole("heading", { name: "0 reviews" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No featured reviews found")).toBeInTheDocument();
    expect(screen.getByText("No standard reviews found")).toBeInTheDocument();
    expect(
      screen.queryByText(/reviews are unavailable/i),
    ).not.toBeInTheDocument();
  });
});
