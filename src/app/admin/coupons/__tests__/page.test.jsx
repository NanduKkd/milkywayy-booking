import { redirect } from "next/navigation";
import CouponsPage from "../page";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("CouponsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects legacy coupons traffic to Promotions", async () => {
    await CouponsPage();

    expect(redirect).toHaveBeenCalledWith("/admin/promotions");
  });
});
