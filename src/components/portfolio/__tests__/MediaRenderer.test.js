import { render, screen } from "../../../test-utils";
import MediaRenderer from "../MediaRenderer";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} fill={props.fill ? "true" : undefined} />;
  },
}));

// Mock react-social-media-embed
jest.mock("react-social-media-embed", () => ({
  YouTubeEmbed: ({ url }) => <div data-testid="youtube-embed">{url}</div>,
  InstagramEmbed: ({ url }) => <div data-testid="instagram-embed">{url}</div>,
}));

describe("MediaRenderer", () => {
  it("renders an image correctly", () => {
    const props = {
      type: OUR_WORK_TYPES.IMAGE,
      url: "https://example.com/image.jpg",
      title: "Test Image",
    };
    render(<MediaRenderer {...props} />);
    const img = screen.getByAltText(props.title);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", props.url);
  });

  it("renders only the first image when carousel is disabled", () => {
    const props = {
      type: OUR_WORK_TYPES.IMAGE,
      url: [
        "https://example.com/first.jpg",
        "https://example.com/second.jpg",
      ],
      title: "Test Image Gallery",
      enableImageCarousel: false,
    };
    render(<MediaRenderer {...props} />);
    const images = screen.getAllByRole("img");

    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", props.url[0]);
    expect(screen.queryByLabelText(/next slide/i)).not.toBeInTheDocument();
  });

  it("renders a YouTube video correctly", () => {
    const props = {
      type: OUR_WORK_TYPES.VIDEO,
      url: "https://youtube.com/watch?v=123",
      title: "Test Video",
    };
    render(<MediaRenderer {...props} />);
    expect(screen.getByTestId("youtube-embed")).toBeInTheDocument();
    expect(screen.getByText(props.url)).toBeInTheDocument();
  });

  it("renders an Instagram reel correctly", () => {
    const props = {
      type: OUR_WORK_TYPES.SHORT_VIDEO,
      url: "https://instagram.com/reel/123",
      title: "Test Reel",
    };
    render(<MediaRenderer {...props} />);
    expect(screen.getByTestId("instagram-embed")).toBeInTheDocument();
    expect(screen.getByText(props.url)).toBeInTheDocument();
  });

  it("renders a 360 view correctly", () => {
    const props = {
      type: OUR_WORK_TYPES.THREE_SIXTY,
      url: "https://panoee.com/123",
      title: "Test 360",
    };
    render(<MediaRenderer {...props} />);
    const iframe = screen.getByTitle(props.title);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", props.url);
  });

  it("renders fallback for unsupported type", () => {
    render(<MediaRenderer type="INVALID" url="" title="" />);
    expect(screen.getByText(/unsupported media type/i)).toBeInTheDocument();
  });
});
