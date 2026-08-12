const mockRequireSuperadminActor = jest.fn();
const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockEnsureTransactionInvoiceUrl = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
  getAuthorizationErrorStatus: (error) => error.authorizationStatus ?? null,
}));

jest.mock("@/lib/helpers/invoice", () => ({
  ensureTransactionInvoiceUrl: (...args) =>
    mockEnsureTransactionInvoiceUrl(...args),
}));

jest.mock("@/lib/db/models/transaction", () => ({
  findAll: (...args) => mockFindAll(...args),
  findOne: (...args) => mockFindOne(...args),
}));

jest.mock("@/lib/db/models/booking", () => ({}));
jest.mock("@/lib/db/models/user", () => ({}));
jest.mock("@/lib/db/relations", () => ({}));

import { GET as regenerateLastInvoice } from "../regenerate-last/route";
import { GET as listInvoices } from "../route";

function authorizationFailure(message, status) {
  return Object.assign(new Error(message), { authorizationStatus: status });
}

describe("admin invoice route authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
  });

  it.each([
    ["list", listInvoices],
    ["regenerate", regenerateLastInvoice],
  ])(
    "rejects anonymous %s access before reading transactions",
    async (_, route) => {
      mockRequireSuperadminActor.mockRejectedValue(
        authorizationFailure("Unauthorized", 401),
      );

      const response = await route();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
      expect(mockFindAll).not.toHaveBeenCalled();
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockEnsureTransactionInvoiceUrl).not.toHaveBeenCalled();
    },
  );

  it("returns forbidden for a signed session without database Super Admin access", async () => {
    mockRequireSuperadminActor.mockRejectedValue(
      authorizationFailure("Forbidden", 403),
    );

    const response = await listInvoices();

    expect(response.status).toBe(403);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("preserves authorized invoice listing and generation", async () => {
    const successfulTransaction = {
      status: "success",
      user: { id: 9 },
      toJSON: jest.fn(() => ({ id: 101, status: "success" })),
    };
    const pendingTransaction = {
      status: "pending",
      toJSON: jest.fn(() => ({ id: 102, status: "pending" })),
    };
    mockFindAll.mockResolvedValue([successfulTransaction, pendingTransaction]);

    const response = await listInvoices();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: 101, status: "success" },
      { id: 102, status: "pending" },
    ]);
    expect(mockEnsureTransactionInvoiceUrl).toHaveBeenCalledWith(
      successfulTransaction,
      successfulTransaction.user,
    );
    expect(mockEnsureTransactionInvoiceUrl).toHaveBeenCalledTimes(1);
  });

  it("preserves authorized last-invoice regeneration", async () => {
    const transaction = {
      id: 101,
      invoiceNumber: "INV-101",
      invoiceUrl: "previous-url",
      user: { id: 9 },
    };
    mockFindOne.mockResolvedValue(transaction);
    mockEnsureTransactionInvoiceUrl.mockResolvedValue("new-url");

    const response = await regenerateLastInvoice();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        success: true,
        transactionId: 101,
        previousUrl: "previous-url",
        newUrl: "new-url",
      }),
    );
    expect(mockEnsureTransactionInvoiceUrl).toHaveBeenCalledWith(
      transaction,
      transaction.user,
    );
  });

  it("preserves the authorized not-found response when no invoice can be regenerated", async () => {
    mockFindOne.mockResolvedValue(null);

    const response = await regenerateLastInvoice();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "No successful transactions found",
    });
    expect(mockEnsureTransactionInvoiceUrl).not.toHaveBeenCalled();
  });
});
