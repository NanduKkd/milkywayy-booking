import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import { auth } from "@/lib/helpers/auth";
import {
  createCoupon,
  deleteCoupon,
  getLaunchPromoStatus,
  toggleCouponStatus,
  validateCoupon,
} from "../coupons";

jest.unmock("../coupons");
jest.unmock("@/lib/actions/utils");

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/db/models/booking", () => ({
  count: jest.fn(),
}));

jest.mock("@/lib/db/models/coupon", () => ({
  findOne: jest.fn(),
}));

jest.mock("@/lib/db/models/transaction", () => ({}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

describe("Coupon Actions", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue({ id: "user-123" });
    Booking.count.mockResolvedValue(0);
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it("rejects manual launch promo entry because it auto-applies instead", async () => {
    const result = await validateCoupon("LAUNCH500", 700);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      valid: false,
      message:
        "Launch credit is applied automatically for eligible first shoots",
    });
    expect(Booking.count).not.toHaveBeenCalled();
  });

  it("returns the lower launch credit tier for an eligible first paid booking", async () => {
    const result = await getLaunchPromoStatus(700);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      active: true,
      eligible: true,
      discount: 250,
    });
    expect(Booking.count).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      include: [
        {
          model: Transaction,
          as: "transaction",
          required: true,
          where: { status: "success" },
        },
      ],
    });
  });

  it("returns the higher launch credit tier once subtotal reaches AED 1000", async () => {
    const result = await getLaunchPromoStatus(1050);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      active: true,
      eligible: true,
      discount: 500,
    });
  });

  it("rejects launch credit after a successful paid booking already exists", async () => {
    Booking.count.mockResolvedValue(1);

    const result = await getLaunchPromoStatus(700);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      active: true,
      eligible: false,
      discount: 0,
    });
  });

  it("rejects legacy coupon admin writes after promotions cutover", async () => {
    await expect(
      createCoupon({
        code: "WELCOME",
        minimumAmount: 300,
        percentDiscount: 15,
        maxDiscount: 150,
      }),
    ).resolves.toEqual({
      success: false,
      message:
        "Legacy coupon admin is retired. Manage generic codes in /admin/promotions.",
      data: null,
    });

    await expect(toggleCouponStatus(1, false)).resolves.toEqual({
      success: false,
      message:
        "Legacy coupon admin is retired. Manage generic codes in /admin/promotions.",
      data: null,
    });

    await expect(deleteCoupon(1)).resolves.toEqual({
      success: false,
      message:
        "Legacy coupon admin is retired. Manage generic codes in /admin/promotions.",
      data: null,
    });
  });
});
