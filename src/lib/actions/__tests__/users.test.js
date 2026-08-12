const mockRequireSuperadminActor = jest.fn();
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockBcryptHash = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: (...args) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
}));

jest.mock("bcrypt", () => ({
  hash: (...args) => mockBcryptHash(...args),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findByPk: (...args) => mockFindByPk(...args),
      findOne: (...args) => mockFindOne(...args),
      create: (...args) => mockCreate(...args),
    },
  },
}));

import { createUser, setCustomerDisabled } from "../users";

describe("user lifecycle actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
    mockBcryptHash.mockResolvedValue("hashed-password");
  });

  it("creates a staff user after database-backed Super Admin authorization", async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 22,
      fullName: "Operations User",
      email: "operations@example.com",
      phone: null,
      role: "SHOOT",
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
    });

    const result = await createUser({
      fullName: "Operations User",
      email: "operations@example.com",
      phone: "",
      role: "SHOOT",
      password: "strong-password",
    });

    expect(result.success).toBe(true);
    expect(mockRequireSuperadminActor).toHaveBeenCalledTimes(1);
    expect(mockBcryptHash).toHaveBeenCalledWith("strong-password", 12);
    expect(mockCreate).toHaveBeenCalledWith({
      fullName: "Operations User",
      email: "operations@example.com",
      phone: null,
      role: "SHOOT",
      password: "hashed-password",
    });
  });

  it("rejects user creation before reading or writing target account data", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockRequireSuperadminActor.mockRejectedValue(new Error("Forbidden"));

    const result = await createUser({
      fullName: "Unexpected Admin",
      email: "unexpected@example.com",
      role: "SUPERADMIN",
      password: "password",
    });

    expect(result).toEqual({
      success: false,
      message: "Forbidden",
      data: null,
    });
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
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
    mockFindByPk.mockResolvedValue(customer);

    const result = await setCustomerDisabled({ userId: 12, disabled: false });

    expect(result.success).toBe(true);
    expect(customer.update).toHaveBeenCalledWith({ disabledAt: null });
  });

  it("refuses to change a non-customer account", async () => {
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
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockRequireSuperadminActor.mockRejectedValue(new Error("Forbidden"));

    const result = await setCustomerDisabled({ userId: 12, disabled: true });

    expect(result.success).toBe(false);
    expect(mockFindByPk).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
