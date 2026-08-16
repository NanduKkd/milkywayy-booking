import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import * as uiHelpers from "@/lib/helpers/ui";
import { fireEvent, render, screen, waitFor } from "../../../test-utils";
import OurWorkPreview from "../OurWorkPreview";

// Mock fetch
global.fetch = jest.fn();

// Mock MediaRenderer
jest.mock("../../portfolio/MediaRenderer", () => ({
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

describe("OurWorkPreview Hover Effect", () => {
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

  it("applies photography-grayscale class to Photography items on desktop", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<OurWorkPreview />);

    await waitFor(() =>
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0),
    );

    const photoItem = screen.getByTestId("work-preview-card-1");
    const container = photoItem.querySelector(".photography-grayscale");

    expect(container).toBeInTheDocument();
  });

  it("does not apply photography-grayscale class to non-Photography items", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<OurWorkPreview />);

    // Switch to Video category
    await waitFor(() =>
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0),
    );
    const videoTab = screen.getByText("Long-form");
    fireEvent.click(videoTab);

    await waitFor(() =>
      expect(screen.getAllByText("Video 1").length).toBeGreaterThan(0),
    );
    const videoItem = screen.getByTestId("work-preview-card-2");

    expect(
      videoItem.querySelector(".photography-grayscale"),
    ).not.toBeInTheDocument();
  });

  it("does not apply photography-grayscale class on touch devices even for Photography", async () => {
    uiHelpers.isTouchDevice.mockReturnValue(true);
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<OurWorkPreview />);

    await waitFor(() =>
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0),
    );

    const photoItem = screen.getByTestId("work-preview-card-1");
    expect(
      photoItem.querySelector(".photography-grayscale"),
    ).not.toBeInTheDocument();
  });
});
