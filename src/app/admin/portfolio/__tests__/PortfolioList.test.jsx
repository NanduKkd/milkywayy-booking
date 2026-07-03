import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import PortfolioList, {
  filterPortfolioItems,
  normalizePortfolioItems,
  reorderPortfolioItems,
} from "../PortfolioList";

jest.mock("sonner", () => ({
  Toaster: () => null,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const initialItems = [
  {
    id: 1,
    title: "Photography One",
    subtitle: "Apartment",
    type: "IMAGE",
    mediaContent: ["one.jpg"],
    isVisible: true,
    order: 0,
  },
  {
    id: 2,
    title: "Long Form One",
    subtitle: "Showcase",
    type: "VIDEO",
    mediaContent: "https://example.com/video",
    isVisible: true,
    order: 1,
  },
  {
    id: 3,
    title: "Photography Two",
    subtitle: "Villa",
    type: "IMAGE",
    mediaContent: ["two.jpg"],
    isVisible: false,
    order: 2,
  },
];

describe("PortfolioList helpers", () => {
  it("sorts items by order and id", () => {
    expect(
      normalizePortfolioItems([
        { id: 7, order: 2 },
        { id: 4, order: 0 },
        { id: 3, order: 0 },
      ]).map((item) => item.id),
    ).toEqual([3, 4, 7]);
  });

  it("reorders only the filtered subset while preserving global sequence for other types", () => {
    expect(
      reorderPortfolioItems(initialItems, "IMAGE", 1, 0).map((item) => ({
        id: item.id,
        order: item.order,
      })),
    ).toEqual([
      { id: 3, order: 0 },
      { id: 2, order: 1 },
      { id: 1, order: 2 },
    ]);
  });
});

describe("PortfolioList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("filters the portfolio table by media type", () => {
    render(<PortfolioList initialItems={initialItems} />);

    expect(screen.getByText("Photography One")).toBeInTheDocument();
    expect(screen.getByText("Long Form One")).toBeInTheDocument();
    expect(screen.getByText("Photography Two")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Photography$/i }));

    expect(screen.getByText("Photography One")).toBeInTheDocument();
    expect(screen.getByText("Photography Two")).toBeInTheDocument();
    expect(screen.queryByText("Long Form One")).not.toBeInTheDocument();
    expect(filterPortfolioItems(initialItems, "IMAGE")).toHaveLength(2);
  });

  it("confirms deletion in the shared dialog before removing an entry", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<PortfolioList initialItems={initialItems} />);

    fireEvent.click(
      screen.getByRole("button", { name: /delete photography one/i }),
    );

    expect(screen.getByText("Delete portfolio entry")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /delete entry/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/our-works/1", {
        method: "DELETE",
      });
    });
  });
});
