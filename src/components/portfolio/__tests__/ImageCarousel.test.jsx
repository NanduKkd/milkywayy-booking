import { fireEvent, render, screen } from "../../../test-utils";
import ImageCarousel from "../ImageCarousel";

describe("ImageCarousel", () => {
  const mockImages = [
    "https://example.com/url1.jpg",
    "https://example.com/url2.jpg",
    "https://example.com/url3.jpg",
  ];
  const title = "Test Carousel";

  it("renders correctly with multiple images", () => {
    render(<ImageCarousel images={mockImages} title={title} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute(
      "src",
      expect.stringContaining("url1.jpg"),
    );
  });

  it("shows navigation arrows when multiple images are present", () => {
    render(<ImageCarousel images={mockImages} title={title} />);

    expect(screen.getByLabelText(/previous slide/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next slide/i)).toBeInTheDocument();
  });

  it("does not show navigation arrows for single image", () => {
    render(
      <ImageCarousel images={["https://example.com/url1.jpg"]} title={title} />,
    );

    expect(screen.queryByLabelText(/previous slide/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/next slide/i)).not.toBeInTheDocument();
  });

  it("navigates forward when clicking next button", () => {
    render(<ImageCarousel images={mockImages} title={title} />);

    const nextButton = screen.getByLabelText(/next slide/i);
    const slidesContainer = screen
      .getByRole("img", { name: /image 1/i })
      .closest(".flex");

    // Initial position
    expect(slidesContainer).toHaveStyle("transform: translateX(-0%)");

    fireEvent.click(nextButton);
    expect(slidesContainer).toHaveStyle("transform: translateX(-100%)");

    fireEvent.click(nextButton);
    expect(slidesContainer).toHaveStyle("transform: translateX(-200%)");

    // Loop back
    fireEvent.click(nextButton);
    expect(slidesContainer).toHaveStyle("transform: translateX(-0%)");
  });

  it("navigates backward when clicking prev button", () => {
    render(<ImageCarousel images={mockImages} title={title} />);

    const prevButton = screen.getByLabelText(/previous slide/i);
    const slidesContainer = screen
      .getByRole("img", { name: /image 1/i })
      .closest(".flex");

    // Initial position, prev should go to last slide
    fireEvent.click(prevButton);
    expect(slidesContainer).toHaveStyle("transform: translateX(-200%)");

    fireEvent.click(prevButton);
    expect(slidesContainer).toHaveStyle("transform: translateX(-100%)");
  });

  it("navigates via indicators", () => {
    render(<ImageCarousel images={mockImages} title={title} />);

    const indicator3 = screen.getByLabelText(/go to slide 3/i);
    const slidesContainer = screen
      .getByRole("img", { name: /image 1/i })
      .closest(".flex");

    fireEvent.click(indicator3);
    expect(slidesContainer).toHaveStyle("transform: translateX(-200%)");
  });
});
