import { render, screen } from "@testing-library/react";
import { getPromotionsAdminData } from "@/lib/actions/promotions";
import PromotionsPage from "../page";

jest.mock("@/lib/actions/promotions", () => ({
  getPromotionsAdminData: jest.fn(),
}));

jest.mock("../PromotionManager", () => ({
  __esModule: true,
  default: function MockPromotionManager({ initialPromotions, loadError }) {
    return (
      <div
        data-testid="promotion-manager"
        data-promotions={JSON.stringify(initialPromotions)}
        data-load-error={loadError ?? ""}
      />
    );
  },
}));

describe("PromotionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes successfully loaded promotions to PromotionManager", async () => {
    const promotions = [
      { id: 101, kind: "GENERIC", name: "Summer offer" },
      { id: 102, kind: "PERSONAL", name: "Partner offer" },
    ];
    getPromotionsAdminData.mockResolvedValue({
      success: true,
      message: null,
      data: { promotions },
    });

    render(await PromotionsPage());

    expect(screen.getByTestId("promotion-manager")).toHaveAttribute(
      "data-promotions",
      JSON.stringify(promotions),
    );
    expect(screen.getByTestId("promotion-manager")).toHaveAttribute(
      "data-load-error",
      "",
    );
  });

  it("passes an empty successful catalog without a load error", async () => {
    getPromotionsAdminData.mockResolvedValue({
      success: true,
      message: null,
      data: { promotions: [] },
    });

    render(await PromotionsPage());

    expect(screen.getByTestId("promotion-manager")).toHaveAttribute(
      "data-promotions",
      "[]",
    );
    expect(screen.getByTestId("promotion-manager")).toHaveAttribute(
      "data-load-error",
      "",
    );
  });

  it("passes a safe load error and no promotions when loading fails", async () => {
    getPromotionsAdminData.mockResolvedValue({
      success: false,
      message: "Unable to load promotions",
      data: null,
    });

    render(await PromotionsPage());

    expect(screen.getByTestId("promotion-manager")).toHaveAttribute(
      "data-promotions",
      "[]",
    );
    expect(screen.getByTestId("promotion-manager")).toHaveAttribute(
      "data-load-error",
      "Unable to load promotions",
    );
  });
});
