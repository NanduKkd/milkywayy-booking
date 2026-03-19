import { render, screen } from "../../../test-utils";
import MediaRenderer from "../MediaRenderer";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";

describe("MediaRenderer", () => {
  const title = "Test Media";

  it("renders a single image when url is a string (backward compatibility)", () => {
    const legacyUrl = "https://example.com/legacy.jpg";
    render(
      <MediaRenderer 
        type={OUR_WORK_TYPES.IMAGE} 
        url={legacyUrl} 
        title={title} 
      />
    );
    
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("legacy.jpg"));
    // Ensure Carousel is NOT rendered (no indicators or arrows)
    expect(screen.queryByLabelText(/next slide/i)).not.toBeInTheDocument();
  });

  it("renders ImageCarousel when url is an array", () => {
    const urls = ["https://example.com/1.jpg", "https://example.com/2.jpg"];
    render(
      <MediaRenderer 
        type={OUR_WORK_TYPES.IMAGE} 
        url={urls} 
        title={title} 
      />
    );
    
    // Carousel should have next slide button
    expect(screen.getByLabelText(/next slide/i)).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("renders only the first image when carousel is disabled", () => {
    const urls = ["https://example.com/1.jpg", "https://example.com/2.jpg"];
    render(
      <MediaRenderer
        type={OUR_WORK_TYPES.IMAGE}
        url={urls}
        title={title}
        enableImageCarousel={false}
      />
    );

    expect(screen.queryByLabelText(/next slide/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("1.jpg"),
    );
  });

  it("renders YouTubeEmbed for VIDEO type", () => {
    const videoUrl = "https://youtube.com/watch?v=123";
    const { container } = render(
      <MediaRenderer 
        type={OUR_WORK_TYPES.VIDEO} 
        url={videoUrl} 
        title={title} 
      />
    );
    
    // Check if something is rendered besides the container
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryByText(/Unsupported Media Type/i)).not.toBeInTheDocument();
  });

  it("renders iframe for 360_VIEW type", () => {
    const panoUrl = "https://example.com/pano";
    render(
      <MediaRenderer 
        type={OUR_WORK_TYPES.THREE_SIXTY} 
        url={panoUrl} 
        title={title} 
      />
    );
    
    const iframe = screen.getByTitle(title);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", panoUrl);
  });
});
