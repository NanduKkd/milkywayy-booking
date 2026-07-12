const mockGetSessionUser = jest.fn();
const mockFindByPk = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: (...args) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/helpers/auth", () => ({
  getSessionUser: (...args) => mockGetSessionUser(...args),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findByPk: (...args) => mockFindByPk(...args),
      findOne: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { setCustomerDisabled } from "../users";

describe("user lifecycle actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables a customer and clears outstanding OTP state", async () => {
    const customer = {
      id: 12,
      role: "CUSTOMER",
      disabledAt: null,
      update: jest.fn(async function update(values) {
        Object.assign(this, values);
      }),
    };
    mockGetSessionUser.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue(customer);

    const result = await setCustomerDisabled({ userId: 12, disabled: true });

    expect(result.success).toBe(true);
    expect(customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        disabledAt: expect.any(Date),
        otp: null,
        otpExpiresAt: null,
        otpAttemptCount: 0,
        otpResendAvailableAt: null,
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("enables a disabled customer", async () => {
    const customer = {
      id: 12,
      role: "CUSTOMER",
      disabledAt: new Date(),
      update: jest.fn(async function update(values) {
        Object.assign(this, values);
      }),
    };
    mockGetSessionUser.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue(customer);

    const result = await setCustomerDisabled({ userId: 12, disabled: false });

    expect(result.success).toBe(true);
    expect(customer.update).toHaveBeenCalledWith({ disabledAt: null });
  });

  it("refuses to change a non-customer account", async () => {
    mockGetSessionUser.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue({ id: 2, role: "SHOOT" });

    const result = await setCustomerDisabled({ userId: 2, disabled: true });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        message: "Customer not found",
      }),
    );
  });

  it("requires a super administrator", async () => {
    mockGetSessionUser.mockResolvedValue({ id: 2, role: "SHOOT" });

    const result = await setCustomerDisabled({ userId: 12, disabled: true });

    expect(result.success).toBe(false);
    expect(mockFindByPk).not.toHaveBeenCalled();
  });
});
