import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import PortfolioManagement from "../page";

// Mock global fetch
global.fetch = jest.fn();

// Mock Next.js navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({
    refresh: mockRefresh,
    replace: jest.fn(),
  })),
}));

// Mock Auth helper
jest.mock("../../../../lib/helpers/auth", () => ({
  getSessionUser: jest.fn(),
}));

describe("Portfolio Management Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders portfolio items after fetching", async () => {
    const { getSessionUser } = require("../../../../lib/helpers/auth");
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });

    const mockItems = [
      { id: 1, title: "Work 1", type: "IMAGE", isVisible: true, order: 0 },
    ];
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    });

    // Since it's an async server component, we render it
    const page = await PortfolioManagement({
      searchParams: Promise.resolve({}),
    });
    render(page);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Portfolio" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Work 1")).toBeInTheDocument();
    });
  });

  it("shows empty state when no items", async () => {
    const { getSessionUser } = require("../../../../lib/helpers/auth");
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const page = await PortfolioManagement({
      searchParams: Promise.resolve({}),
    });
    render(page);

    await waitFor(() => {
      expect(screen.getByText(/no portfolio items found/i)).toBeInTheDocument();
    });
  });

  it("shows the inline fetch error state while preserving the refreshed shell", async () => {
    const { getSessionUser } = require("../../../../lib/helpers/auth");
    getSessionUser.mockResolvedValue({ role: "SUPERADMIN" });

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Portfolio API unavailable" }),
    });

    const page = await PortfolioManagement({
      searchParams: Promise.resolve({}),
    });
    render(page);

    await waitFor(() => {
      expect(
        screen.getByText(/unable to load every portfolio entry/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Portfolio API unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Portfolio unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/portfolio entries are unavailable/i),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /retry load/i });
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /new entry/i })).toBeDisabled();
    expect(
      screen.queryByText(/no portfolio items found/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/create the first portfolio entry/i),
    ).not.toBeInTheDocument();
  });
});
