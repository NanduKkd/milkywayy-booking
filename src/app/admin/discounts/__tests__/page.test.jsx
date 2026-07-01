import { redirect } from "next/navigation";
import DiscountsPage from "../page";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("DiscountsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects legacy discounts traffic to Promotions", async () => {
    await DiscountsPage();

    expect(redirect).toHaveBeenCalledWith("/admin/promotions");
  });
});
