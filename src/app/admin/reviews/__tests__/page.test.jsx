import { render, screen, waitFor } from "../../../../test-utils";
import ReviewsManagement from "../page";

global.fetch = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
  })),
}));

jest.mock("../../../../lib/helpers/auth", () => ({
  getSessionUser: jest.fn(),
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
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
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
      ],
    });

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

  it("shows the inline fetch error state while preserving the refreshed shell", async () => {
    const { getSessionUser } = require("../../../../lib/helpers/auth");
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Reviews API unavailable" }),
    });

    const page = await ReviewsManagement({
      searchParams: Promise.resolve({}),
    });
    render(page);

    await waitFor(() => {
      expect(
        screen.getByText(/unable to load every review/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Reviews API unavailable")).toBeInTheDocument();
  });
});
