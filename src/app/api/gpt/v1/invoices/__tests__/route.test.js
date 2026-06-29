const { Op } = require("sequelize");

const mockAuthenticateGptApiRequest = jest.fn();
const mockBuildGptApiAuthorizationErrorResponse = jest.fn();
const mockFindAllTransactions = jest.fn();

jest.mock("@/lib/db/models", () => ({
  Booking: {
    name: "Booking",
  },
  Transaction: {
    findAll: (...args) => mockFindAllTransactions(...args),
  },
}));

jest.mock("@/lib/db/relations", () => ({}));

jest.mock("../../_lib/auth", () => {
  class MockGptApiAuthorizationError extends Error {
    constructor({
      code = "invalid_token",
      description = "Authentication is required.",
      headers = {
        "WWW-Authenticate": 'Bearer realm="gpt-action-api"',
      },
      reasonCode = "authorization_invalid",
      statusCode = 401,
    } = {}) {
      super(description);
      this.name = "GptApiAuthorizationError";
      this.code = code;
      this.description = description;
      this.headers = headers;
      this.reasonCode = reasonCode;
      this.statusCode = statusCode;
    }
  }

  return {
    authenticateGptApiRequest: (...args) =>
      mockAuthenticateGptApiRequest(...args),
    buildGptApiAuthorizationErrorResponse: (...args) =>
      mockBuildGptApiAuthorizationErrorResponse(...args),
    GptApiAuthorizationError: MockGptApiAuthorizationError,
  };
});

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      json: async () => data,
      headers: new Headers(init.headers || {}),
      status: init.status || 200,
    })),
  },
}));

const { GptApiAuthorizationError } = require("../../_lib/auth");
const { GET } = require("../route");

describe("GPT API invoices list route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildGptApiAuthorizationErrorResponse.mockImplementation((error) => ({
      json: async () => ({
        error: error.code,
      }),
      headers: new Headers(error.headers || {}),
      status: error.statusCode || 401,
    }));
  });

  it("returns customer-scoped invoice metadata with safe links and pagination", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 9,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindAllTransactions.mockResolvedValue([
      {
        id: 55,
        amount: "425.50",
        status: "success",
        invoiceNumber: null,
        paidAt: "2026-06-29T12:05:00.000Z",
        createdAt: "2026-06-29T12:00:00.000Z",
        bookings: [{ bookingCode: "MWB-1001" }, { bookingCode: "MWB-1002" }],
      },
      {
        id: 54,
        amount: "300.00",
        status: "success",
        invoiceNumber: "MW-2026-0628-002",
        paidAt: "2026-06-28T09:05:00.000Z",
        createdAt: "2026-06-28T09:00:00.000Z",
        bookings: [{ bookingCode: "MWB-1003" }],
      },
    ]);

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer oauth-access-token",
      }),
      url: "https://milkywayy.com/api/gpt/v1/invoices?invoiceNumber=INV-000055&limit=1&paidFrom=2026-06-01&paidTo=2026-06-30&status=success",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      invoices: [
        {
          amount: 425.5,
          bookingCodes: ["MWB-1001", "MWB-1002"],
          createdAt: "2026-06-29T12:00:00.000Z",
          currency: "AED",
          invoiceNumber: "INV-000055",
          paidAt: "2026-06-29T12:05:00.000Z",
          status: "success",
          websiteUrl: "/dashboard/invoices?invoiceNumber=INV-000055",
        },
      ],
      pagination: {
        hasMore: true,
        nextCursor: expect.any(String),
      },
    });
    expect(mockAuthenticateGptApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.any(Headers),
        url: expect.any(String),
      }),
      {
        requiredScopes: ["customer:read"],
      },
    );
    expect(mockFindAllTransactions).toHaveBeenCalledWith({
      attributes: [
        "id",
        "amount",
        "status",
        "invoiceNumber",
        "paidAt",
        "createdAt",
      ],
      include: [
        {
          attributes: ["id", "bookingCode"],
          as: "bookings",
          model: {
            name: "Booking",
          },
        },
      ],
      limit: 2,
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      where: expect.any(Object),
    });

    const query = mockFindAllTransactions.mock.calls[0][0];
    expect(query.where[Op.and]).toEqual(
      expect.arrayContaining([
        { userId: 42 },
        { status: "success" },
        {
          paidAt: {
            [Op.gte]: "2026-06-01T00:00:00.000Z",
            [Op.lte]: "2026-06-30T23:59:59.999Z",
          },
        },
        {
          [Op.or]: [
            { invoiceNumber: "INV-000055" },
            { id: 55, invoiceNumber: null },
          ],
        },
      ]),
    );
  });

  it("returns a 422 invalid_request response for malformed list query parameters", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 9,
      customerId: 42,
      scopes: ["customer:read"],
    });

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer oauth-access-token",
      }),
      url: "https://milkywayy.com/api/gpt/v1/invoices?paidFrom=2026-06-40",
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      details: expect.any(Array),
      error: "invalid_request",
    });
    expect(mockFindAllTransactions).not.toHaveBeenCalled();
  });

  it("returns the shared authorization error response for invalid bearer tokens", async () => {
    const authError = new GptApiAuthorizationError({
      code: "invalid_token",
      reasonCode: "access_token_revoked",
      statusCode: 401,
    });
    mockAuthenticateGptApiRequest.mockRejectedValue(authError);

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer revoked-token",
      }),
      url: "https://milkywayy.com/api/gpt/v1/invoices",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
    expect(mockBuildGptApiAuthorizationErrorResponse).toHaveBeenCalledWith(
      authError,
    );
    expect(mockFindAllTransactions).not.toHaveBeenCalled();
  });
});
