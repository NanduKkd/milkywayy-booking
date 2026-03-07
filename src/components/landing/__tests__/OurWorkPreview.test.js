import { render, screen, waitFor, fireEvent } from "../../../test-utils";
import OurWorkPreview from "../OurWorkPreview";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";

// Mock fetch
global.fetch = jest.fn();

// Mock MediaRenderer to avoid complex sub-rendering
jest.mock("../../portfolio/MediaRenderer", () => ({
  __esModule: true,
  default: ({ title }) => <div data-testid="media-renderer">{title}</div>,
}));

describe("OurWorkPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockData = [
    { id: 1, title: "Photo 1", type: OUR_WORK_TYPES.IMAGE, mediaContent: "url1" },
    { id: 2, title: "360 1", type: OUR_WORK_TYPES.THREE_SIXTY, mediaContent: "url2" },
    { id: 3, title: "Video 1", type: OUR_WORK_TYPES.VIDEO, mediaContent: "url3" },
    { id: 4, title: "Photo 2", type: OUR_WORK_TYPES.IMAGE, mediaContent: "url4" },
  ];

  it("renders fetched items correctly filtered by photography by default", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<OurWorkPreview />);

    // Check loading state (optional as it might be too fast)
    
    await waitFor(() => {
      expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Photo 2").length).toBeGreaterThan(0);
      expect(screen.queryByText("360 1")).not.toBeInTheDocument();
    });
  });

  it("switches category when clicking tabs", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<OurWorkPreview />);

    await waitFor(() => expect(screen.getAllByText("Photo 1").length).toBeGreaterThan(0));

    const tab360 = screen.getByText("360°");
    fireEvent.click(tab360);

    await waitFor(() => {
      expect(screen.getAllByText("360 1").length).toBeGreaterThan(0);
      expect(screen.queryByText("Photo 1")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no items in category", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { container } = render(<OurWorkPreview />);

    await waitFor(() => {
      expect(container.querySelectorAll("div.bg-gradient-to-br").length).toBe(6);
    });
  });
});
