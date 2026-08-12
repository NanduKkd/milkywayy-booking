const mockRequireSuperadminActor = jest.fn();
const mockFindOne = jest.fn();
const mockFindOrCreate = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
}));

jest.mock("@/lib/db/models/dynamicconfig", () => ({
  findOne: (...args) => mockFindOne(...args),
  findOrCreate: (...args) => mockFindOrCreate(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args) => mockRevalidatePath(...args),
}));

jest.unmock("../discounts");
jest.unmock("../utils");

const { getDiscounts, saveDiscounts } = require("../discounts");

describe("discount server actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
  });

  it("keeps discount reads public for booking calculations", async () => {
    const discounts = [{ id: "discount-1", name: "Launch" }];
    mockFindOne.mockResolvedValue({ value: discounts });

    await expect(getDiscounts()).resolves.toEqual({
      success: true,
      message: null,
      data: discounts,
    });
    expect(mockRequireSuperadminActor).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized discount write before configuration access", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockRequireSuperadminActor.mockRejectedValue(new Error("Forbidden"));

    await expect(saveDiscounts([])).resolves.toEqual({
      success: false,
      message: "Forbidden",
      data: null,
    });
    expect(mockFindOrCreate).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("preserves the authorized discount normalization and revalidation flow", async () => {
    const config = { update: jest.fn() };
    mockFindOrCreate.mockResolvedValue([config, false]);

    const result = await saveDiscounts([
      {
        id: "discount-1",
        name: "Launch",
        type: "direct",
        minAmount: "100",
        percentage: "10",
        maxDiscount: "50",
        expiryDays: "30",
        isActive: true,
      },
    ]);

    expect(result.success).toBe(true);
    expect(config.update).toHaveBeenCalledWith({
      value: [
        {
          id: "discount-1",
          name: "Launch",
          type: "direct",
          minAmount: 100,
          percentage: 10,
          maxDiscount: 50,
          expiryDays: 30,
          isActive: true,
        },
      ],
    });
    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/admin/discounts"],
      ["/booking"],
    ]);
  });
});
