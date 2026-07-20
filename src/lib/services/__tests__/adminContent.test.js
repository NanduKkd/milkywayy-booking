import OurWork from "@/lib/db/models/ourwork";
import Review from "@/lib/db/models/review";
import {
  listAdminPortfolioItems,
  listAdminReviews,
} from "@/lib/services/adminContent";

jest.mock("@/lib/db/models/ourwork", () => ({
  findAll: jest.fn(),
}));

jest.mock("@/lib/db/models/review", () => ({
  findAll: jest.fn(),
}));

describe("admin content service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads every portfolio item directly from the model", async () => {
    OurWork.findAll.mockResolvedValue([
      {
        toJSON: () => ({ id: 1, isVisible: false, title: "Hidden work" }),
      },
    ]);

    await expect(listAdminPortfolioItems()).resolves.toEqual([
      { id: 1, isVisible: false, title: "Hidden work" },
    ]);
    expect(OurWork.findAll).toHaveBeenCalledWith({
      order: [
        ["order", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
  });

  it("keeps the portfolio compatible with databases missing thumbnail", async () => {
    OurWork.findAll
      .mockRejectedValueOnce({
        parent: {
          code: "42703",
          sql: 'SELECT "thumbnail" FROM "our_works"',
        },
      })
      .mockResolvedValueOnce([
        {
          toJSON: () => ({ id: 2, title: "Legacy work" }),
        },
      ]);

    await expect(listAdminPortfolioItems()).resolves.toEqual([
      { id: 2, thumbnail: null, title: "Legacy work" },
    ]);
    expect(OurWork.findAll).toHaveBeenCalledTimes(2);
    expect(OurWork.findAll.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        attributes: expect.not.arrayContaining(["thumbnail"]),
      }),
    );
  });

  it("loads reviews in their public display order", async () => {
    Review.findAll.mockResolvedValue([
      {
        toJSON: () => ({ featured: true, id: 3, name: "Featured client" }),
      },
    ]);

    await expect(listAdminReviews()).resolves.toEqual([
      { featured: true, id: 3, name: "Featured client" },
    ]);
    expect(Review.findAll).toHaveBeenCalledWith({
      order: [
        ["featured", "DESC"],
        ["order", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
  });
});
