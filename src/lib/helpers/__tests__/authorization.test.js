const mockAuth = jest.fn();
const mockFindByPk = jest.fn();

jest.mock("@/lib/helpers/auth", () => ({
  auth: (...args) => mockAuth(...args),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findByPk: (...args) => mockFindByPk(...args),
    },
  },
}));

import {
  AuthorizationError,
  getAuthorizationErrorStatus,
  requireCustomerActor,
  requireInvoiceDownloadActor,
  requireSuperadminActor,
} from "../authorization";

describe("database-backed authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an anonymous administrator request before a database lookup", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireSuperadminActor()).rejects.toEqual(
      expect.objectContaining({
        message: "Unauthorized",
        status: 401,
      }),
    );
    expect(mockFindByPk).not.toHaveBeenCalled();
  });

  it("rejects a forged administrator role when the database user is a customer", async () => {
    mockAuth.mockResolvedValue({ id: "42", role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue({ id: 42, role: "CUSTOMER" });

    await expect(requireSuperadminActor()).rejects.toEqual(
      expect.objectContaining({
        message: "Forbidden",
        status: 403,
      }),
    );
    expect(mockFindByPk).toHaveBeenCalledWith("42", {
      attributes: ["id", "role", "disabledAt"],
    });
  });

  it("rejects a signed session whose database account no longer exists", async () => {
    mockAuth.mockResolvedValue({ id: "42", role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue(null);

    await expect(requireSuperadminActor()).rejects.toEqual(
      expect.objectContaining({
        message: "Forbidden",
        status: 403,
      }),
    );
  });

  it("uses the database role when the signed session role is stale", async () => {
    mockAuth.mockResolvedValue({ id: "42", role: "CUSTOMER" });
    mockFindByPk.mockResolvedValue({ id: "42", role: "SUPERADMIN" });

    await expect(requireSuperadminActor()).resolves.toEqual({
      id: 42,
      role: "SUPERADMIN",
    });
  });

  it("scopes a customer actor to the active database account", async () => {
    mockAuth.mockResolvedValue({ id: "51", role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue({
      id: "51",
      role: "CUSTOMER",
      disabledAt: null,
    });

    await expect(requireCustomerActor()).resolves.toEqual({
      id: 51,
      role: "CUSTOMER",
    });
  });

  it("rejects a disabled customer account", async () => {
    mockAuth.mockResolvedValue({ id: 51, role: "CUSTOMER" });
    mockFindByPk.mockResolvedValue({
      id: 51,
      role: "CUSTOMER",
      disabledAt: new Date(),
    });

    await expect(requireCustomerActor()).rejects.toEqual(
      expect.objectContaining({
        message: "Unauthorized",
        status: 401,
      }),
    );
  });

  it("uses the database customer role to scope invoice downloads despite a forged session role", async () => {
    mockAuth.mockResolvedValue({ id: "51", role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue({
      id: "51",
      role: "CUSTOMER",
      disabledAt: null,
    });

    await expect(requireInvoiceDownloadActor()).resolves.toEqual({
      id: 51,
      role: "CUSTOMER",
    });
  });

  it("rejects a non-customer, non-Super Admin database actor for invoice downloads", async () => {
    mockAuth.mockResolvedValue({ id: "61", role: "SUPERADMIN" });
    mockFindByPk.mockResolvedValue({
      id: "61",
      role: "SHOOT",
      disabledAt: null,
    });

    await expect(requireInvoiceDownloadActor()).rejects.toEqual(
      expect.objectContaining({
        message: "Forbidden",
        status: 403,
      }),
    );
  });

  it("maps only typed authorization errors to HTTP statuses", () => {
    expect(
      getAuthorizationErrorStatus(new AuthorizationError("Forbidden", 403)),
    ).toBe(403);
    expect(getAuthorizationErrorStatus(new Error("Database unavailable"))).toBe(
      null,
    );
  });
});
