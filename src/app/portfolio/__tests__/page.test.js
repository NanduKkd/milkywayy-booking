import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import { PUBLIC_CONTACT } from "@/lib/config/publicContact";
import { fireEvent, render, screen, waitFor } from "../../../test-utils";
import PortfolioPage from "../page";

// Mock fetch
global.fetch = jest.fn();

// Mock components
jest.mock("@/components/StarBackground", () => ({
  __esModule: true,
  default: () => <div data-testid="star-background" />,
}));
jest.mock("@/components/landing/AnnouncementBar", () => ({
  __esModule: true,
  default: () => <div data-testid="announcement-bar" />,
}));
jest.mock("@/components/NewNavbar", () => ({
  __esModule: true,
  default: () => <div data-testid="new-navbar" />,
}));
jest.mock("@/components/Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="footer" />,
}));
jest.mock("@/components/portfolio/MediaRenderer", () => ({
  __esModule: true,
  default: ({ title }) => <div data-testid="media-renderer">{title}</div>,
}));

describe("PortfolioPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockData = [
    {
      id: 1,
      title: "Photo 1",
      type: OUR_WORK_TYPES.IMAGE,
      mediaContent: "url1",
    },
    {
      id: 2,
      title: "360 1",
      type: OUR_WORK_TYPES.THREE_SIXTY,
      mediaContent: "url2",
    },
    {
      id: 3,
      title: "Video 1",
      type: OUR_WORK_TYPES.VIDEO,
      mediaContent: "url3",
    },
  ];

  it("renders page structure and fetched items", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<PortfolioPage />);

    expect(screen.getByTestId("star-background")).toBeInTheDocument();
    expect(screen.getByText("Our Works")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("link", { name: "WhatsApp Us" })).toHaveAttribute(
      "href",
      PUBLIC_CONTACT.whatsappLink,
    );
  });

  it("filters items by tab", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<PortfolioPage />);

    await waitFor(() =>
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0),
    );

    const tab360 = screen.getByRole("tab", { name: "360°" });
    fireEvent.click(tab360);

    // For Radix tabs in tests, sometimes we need to fireKeyDown Enter or Space
    fireEvent.keyDown(tab360, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(tab360).toHaveAttribute("data-state", "active");
      expect(screen.getAllByText("360 1").length).toBeGreaterThan(0);
      expect(screen.queryByText("Photo 1")).not.toBeInTheDocument();
    });
  });

  it("shows empty state message", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/no entries found in this category/i),
      ).toBeInTheDocument();
    });
  });

  it("does not open preview for long-form videos", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<PortfolioPage />);

    await waitFor(() =>
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0),
    );

    const videoTab = screen.getByRole("tab", { name: "Long-form Videos" });
    fireEvent.click(videoTab);
    fireEvent.keyDown(videoTab, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByTestId("work-preview-card-3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("work-preview-card-3"));

    expect(screen.queryByTestId("work-preview-dialog")).not.toBeInTheDocument();
  });
});
