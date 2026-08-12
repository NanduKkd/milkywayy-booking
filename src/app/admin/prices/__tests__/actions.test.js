const mockRequireSuperadminActor = jest.fn();
const mockFindOrCreate = jest.fn();
const mockFetchPricingConfig = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
}));

jest.mock("@/lib/db/models", () => ({
  DynamicConfig: {
    findOrCreate: (...args) => mockFindOrCreate(...args),
  },
}));

jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: (...args) => mockFetchPricingConfig(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args) => mockRevalidatePath(...args),
}));

import { getPricingConfig, savePricingConfig } from "../actions";

describe("pricing server actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
  });

  it("keeps pricing reads public for the booking flow", async () => {
    const pricing = { Apartment: { sizes: [] } };
    mockFetchPricingConfig.mockResolvedValue(pricing);

    await expect(getPricingConfig()).resolves.toEqual({
      success: true,
      message: null,
      data: pricing,
    });
    expect(mockRequireSuperadminActor).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized pricing write before configuration access", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockRequireSuperadminActor.mockRejectedValue(new Error("Forbidden"));

    await expect(savePricingConfig({ Apartment: {} })).resolves.toEqual({
      success: false,
      message: "Forbidden",
      data: null,
    });
    expect(mockFindOrCreate).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("preserves the existing authorized pricing update and revalidation flow", async () => {
    const config = { value: null, save: jest.fn() };
    const pricing = { Apartment: { sizes: [] } };
    mockFindOrCreate.mockResolvedValue([config, false]);

    const result = await savePricingConfig(pricing);

    expect(result.success).toBe(true);
    expect(config.value).toBe(pricing);
    expect(config.save).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/booking"],
      ["/admin/prices"],
    ]);
  });
});
