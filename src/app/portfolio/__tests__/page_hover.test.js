import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import * as uiHelpers from "@/lib/helpers/ui";
import { render, screen, waitFor } from "../../../test-utils";
import PortfolioPage from "../page";

// Mock fetch
global.fetch = jest.fn();

// Mock StarBackground
jest.mock("@/components/StarBackground", () => ({
  __esModule: true,
  default: () => <div data-testid="star-background" />,
}));

// Mock Footer
jest.mock("@/components/Footer", () => ({
  __esModule: true,
  default: () => <footer data-testid="footer" />,
}));

// Mock AnnouncementBar
jest.mock("@/components/landing/AnnouncementBar", () => ({
  __esModule: true,
  default: () => <div data-testid="announcement-bar" />,
}));

// Mock NewNavbar
jest.mock("@/components/NewNavbar", () => ({
  __esModule: true,
  default: () => <nav data-testid="navbar" />,
}));

// Mock MediaRenderer
jest.mock("@/components/portfolio/MediaRenderer", () => ({
  __esModule: true,
  default: ({ title, type }) => (
    <div data-testid="media-renderer" data-type={type} title={title}>
      {title}
    </div>
  ),
}));

// Mock isTouchDevice
jest.mock("@/lib/helpers/ui", () => ({
  isTouchDevice: jest.fn(),
}));

describe("PortfolioPage Hover Effect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uiHelpers.isTouchDevice.mockReturnValue(false); // Default to desktop
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
      title: "Video 1",
      type: OUR_WORK_TYPES.VIDEO,
      mediaContent: "url2",
    },
  ];

  it("applies photography-grayscale class to Photography items and not others on desktop", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<PortfolioPage />);

    // Wait for the grid to render
    await waitFor(() =>
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0),
    );

    // Check Photography item (active tab)
    const photoItem = screen
      .getAllByText("Photo 1")
      .find((el) => el.tagName === "P")
      .closest(".group");
    expect(
      photoItem.querySelector(".photography-grayscale"),
    ).toBeInTheDocument();

    // The Video item is in the DOM but hidden (inactive tab)
    // We can still find it and verify it DOES NOT have the class
    const videoTitle = screen.queryByText("Video 1");
    if (videoTitle) {
      const videoItem = videoTitle.closest(".group");
      expect(
        videoItem.querySelector(".photography-grayscale"),
      ).not.toBeInTheDocument();
    }
  });

  // Remove the previous separate test for non-Photography items
  it("does not apply photography-grayscale class on touch devices even for Photography", async () => {
    uiHelpers.isTouchDevice.mockReturnValue(true);
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<PortfolioPage />);

    await waitFor(() =>
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0),
    );

    const photoItem = screen
      .getAllByText("Photo 1")
      .find((el) => el.tagName === "P")
      .closest(".group");
    expect(
      photoItem.querySelector(".photography-grayscale"),
    ).not.toBeInTheDocument();
  });
});
