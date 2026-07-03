import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import ReviewList, {
  buildReviewGroups,
  normalizeReviewItems,
  reorderReviewItems,
} from "../ReviewList";

jest.mock("sonner", () => ({
  Toaster: () => null,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const initialItems = [
  {
    id: 4,
    name: "Nadia Prime",
    role: "Broker",
    company: "Orbit Realty",
    rating: 5,
    source: "Google",
    featured: false,
    order: 1,
    isVisible: true,
  },
  {
    id: 2,
    name: "Amina First",
    role: "Marketing Lead",
    company: "Dune Estates",
    rating: 4,
    source: "Google",
    featured: true,
    order: 1,
    isVisible: true,
  },
  {
    id: 1,
    name: "Omar Highlight",
    role: "Founder",
    company: "Palm Keys",
    rating: 5,
    source: "Google",
    featured: true,
    order: 0,
    isVisible: false,
  },
  {
    id: 3,
    name: "Lina Standard",
    role: "Agent",
    company: "Marina Homes",
    rating: 5,
    source: "Google",
    featured: false,
    order: 0,
    isVisible: true,
  },
];

describe("ReviewList helpers", () => {
  it("sorts featured reviews before standard reviews and keeps group order stable", () => {
    expect(normalizeReviewItems(initialItems).map((item) => item.id)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("reorders only the targeted review group and reassigns group order values", () => {
    expect(
      reorderReviewItems(initialItems, "featured", 1, 0).map((item) => ({
        id: item.id,
        order: item.order,
      })),
    ).toEqual([
      { id: 2, order: 0 },
      { id: 1, order: 1 },
      { id: 3, order: 0 },
      { id: 4, order: 1 },
    ]);
  });
});

describe("ReviewList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("renders separate featured and standard review groups", () => {
    render(<ReviewList initialItems={initialItems} />);

    expect(screen.getByText("Featured reviews")).toBeInTheDocument();
    expect(screen.getByText("Standard reviews")).toBeInTheDocument();
    expect(screen.getByText("2 featured")).toBeInTheDocument();

    const { featuredItems, standardItems } = buildReviewGroups(initialItems);
    expect(featuredItems).toHaveLength(2);
    expect(standardItems).toHaveLength(2);
  });

  it("moves a review to the end of the destination group when toggling featured state", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...initialItems[2],
        featured: true,
        order: 2,
      }),
    });

    render(<ReviewList initialItems={initialItems} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /move lina standard to featured reviews/i,
      }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/reviews/3",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ featured: true, order: 2 }),
        }),
      );
    });
  });

  it("confirms deletion in the shared dialog before removing a review", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<ReviewList initialItems={initialItems} />);

    fireEvent.click(
      screen.getByRole("button", { name: /delete omar highlight/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Delete review" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /delete review/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/reviews/1", {
        method: "DELETE",
      });
    });
  });
});
