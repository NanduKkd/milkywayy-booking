import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "../../../../test-utils";
import PortfolioForm from "../PortfolioForm";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => {
    return <span role="img" aria-label={props.alt} data-src={props.src} />;
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe("PortfolioForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with initial data (IMAGE type)", () => {
    const initialData = {
      id: 1,
      title: "Test Work",
      subtitle: "Sub",
      type: OUR_WORK_TYPES.IMAGE,
      mediaContent: ["url1.jpg", "url2.jpg"],
      order: 5,
      isVisible: true,
    };

    render(<PortfolioForm initialData={initialData} onSuccess={() => {}} />);

    expect(screen.getByLabelText("Title", { selector: "input" })).toHaveValue(
      "Test Work",
    );
    expect(
      screen.getByLabelText("Subtitle", { selector: "input" }),
    ).toHaveValue("Sub");
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();

    // Check if images are rendered
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("data-src", "url1.jpg");
    expect(images[1]).toHaveAttribute("data-src", "url2.jpg");
  });

  it("renders the form for VIDEO type (single URL)", () => {
    const initialData = {
      id: 1,
      title: "Video Work",
      type: OUR_WORK_TYPES.VIDEO,
      mediaContent: "https://youtube.com/watch?v=123",
      order: 0,
    };

    render(<PortfolioForm initialData={initialData} onSuccess={() => {}} />);

    const input = screen.getByPlaceholderText(
      /YouTube, Instagram, or Panoee link/i,
    );
    expect(input).toHaveValue("https://youtube.com/watch?v=123");
  });

  it("handles image removal", () => {
    const initialData = {
      id: 1,
      title: "Test Work",
      type: OUR_WORK_TYPES.IMAGE,
      mediaContent: ["url1.jpg", "url2.jpg"],
    };

    render(<PortfolioForm initialData={initialData} onSuccess={() => {}} />);

    const removeButtons = screen
      .getAllByRole("button")
      .filter((button) => button.querySelector("svg.lucide-x"));
    fireEvent.click(removeButtons[0]);

    // One image should remain
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAttribute("data-src", "url2.jpg");
  });

  it("submits the form correctly", async () => {
    const onSuccess = jest.fn();
    const initialData = {
      id: 1,
      title: "Test Work",
      type: OUR_WORK_TYPES.IMAGE,
      mediaContent: ["url1.jpg"],
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...initialData, title: "Updated Title" }),
    });

    render(<PortfolioForm initialData={initialData} onSuccess={onSuccess} />);

    const titleInput = screen.getByLabelText("Title", { selector: "input" });
    fireEvent.change(titleInput, { target: { value: "Updated Title" } });

    fireEvent.click(screen.getByRole("button", { name: /Update Entry/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/our-works/1"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"title":"Updated Title"'),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("resets edit values when initial data changes", async () => {
    const firstItem = {
      id: 1,
      title: "First Work",
      type: OUR_WORK_TYPES.IMAGE,
      mediaContent: ["first.jpg"],
      order: 0,
    };
    const secondItem = {
      id: 2,
      title: "Second Work",
      type: OUR_WORK_TYPES.VIDEO,
      mediaContent: "https://youtube.com/watch?v=456",
      order: 1,
    };

    const { rerender } = render(
      <PortfolioForm initialData={firstItem} onSuccess={() => {}} />,
    );

    expect(screen.getByLabelText("Title", { selector: "input" })).toHaveValue(
      "First Work",
    );

    await act(async () => {
      rerender(<PortfolioForm initialData={secondItem} onSuccess={() => {}} />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Title", { selector: "input" })).toHaveValue(
        "Second Work",
      );
      expect(
        screen.getByPlaceholderText(/YouTube, Instagram, or Panoee link/i),
      ).toHaveValue("https://youtube.com/watch?v=456");
    });
  });
});
