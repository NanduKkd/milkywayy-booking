const { Op } = require("sequelize");

const mockAuthenticateGptApiRequest = jest.fn();
const mockBuildGptApiAuthorizationErrorResponse = jest.fn();
const mockFindAllBookings = jest.fn();

jest.mock("@/lib/db/models", () => ({
  Booking: {
    findAll: (...args) => mockFindAllBookings(...args),
  },
}));

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

  class MockGptApiRateLimitError extends Error {
    constructor({
      bucketType = "oauth-gpt-resource-user",
      retryAfterSeconds = 30,
      statusCode = 429,
    } = {}) {
      super("Too many requests. Please wait before trying again.");
      this.name = "GptApiRateLimitError";
      this.bucketType = bucketType;
      this.retryAfterSeconds = retryAfterSeconds;
      this.statusCode = statusCode;
    }
  }

  return {
    authenticateGptApiRequest: (...args) =>
      mockAuthenticateGptApiRequest(...args),
    buildGptApiAuthorizationErrorResponse: (...args) =>
      mockBuildGptApiAuthorizationErrorResponse(...args),
    GptApiAuthorizationError: MockGptApiAuthorizationError,
    GptApiRateLimitError: MockGptApiRateLimitError,
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

describe("GPT API bookings list route", () => {
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

  it("returns customer-scoped booking results with stable pagination", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 9,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindAllBookings.mockResolvedValue([
      {
        id: 10,
        bookingCode: null,
        status: "CONFIRMED",
        workflowStatus: "FILES_UPLOADED",
        shootDetails: {
          services: ["Photography", "Photography", "Videography"],
        },
        propertyDetails: {
          building: "Aurora Tower",
          community: "Dubai Marina",
          propertyType: "Apartment",
          unitNumber: "1203",
        },
        date: "2026-06-15",
        startTime: "09:00",
        total: "525.00",
        createdAt: "2026-06-20T10:00:00.000Z",
      },
      {
        id: 8,
        bookingCode: "MWB-1008",
        status: "CONFIRMED",
        workflowStatus: "SHOOT_BOOKED",
        shootDetails: {
          services: ["Photography"],
        },
        propertyDetails: {
          community: "Palm Jumeirah",
          propertyType: "Villa",
        },
        date: "2026-06-10",
        startTime: "14:00",
        total: "700.00",
        createdAt: "2026-06-19T10:00:00.000Z",
      },
    ]);

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer oauth-access-token",
      }),
      url: "https://milkywayy.com/api/gpt/v1/bookings?bookingCode=MWB-1010&limit=1&scheduledFrom=2026-06-01&scheduledTo=2026-06-30&status=CONFIRMED&workflowStatus=FILES_UPLOADED",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      bookings: [
        {
          bookingCode: "MWB-1010",
          createdAt: "2026-06-20T10:00:00.000Z",
          currency: "AED",
          property: {
            building: "Aurora Tower",
            community: "Dubai Marina",
            locationLabel: "1203, Aurora Tower, Dubai Marina",
            propertySize: null,
            propertyType: "Apartment",
            unitNumber: "1203",
          },
          scheduledDate: "2026-06-15",
          scheduledStartTime: "09:00",
          services: ["Photography", "Videography"],
          status: "CONFIRMED",
          totalAmount: 525,
          workflowStatus: "FILES_UPLOADED",
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
    expect(mockFindAllBookings).toHaveBeenCalledWith({
      attributes: [
        "id",
        "bookingCode",
        "status",
        "workflowStatus",
        "shootDetails",
        "propertyDetails",
        "date",
        "startTime",
        "total",
        "createdAt",
      ],
      limit: 2,
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      where: expect.any(Object),
    });

    const query = mockFindAllBookings.mock.calls[0][0];
    expect(query.where[Op.and]).toEqual(
      expect.arrayContaining([
        { userId: 42 },
        { status: "CONFIRMED" },
        { workflowStatus: "FILES_UPLOADED" },
        {
          date: {
            [Op.gte]: "2026-06-01",
            [Op.lte]: "2026-06-30",
          },
        },
        {
          [Op.or]: [{ bookingCode: "MWB-1010" }, { bookingCode: null, id: 10 }],
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
      url: "https://milkywayy.com/api/gpt/v1/bookings?cursor=not-a-real-cursor",
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      details: expect.any(Array),
      error: "invalid_request",
    });
    expect(mockFindAllBookings).not.toHaveBeenCalled();
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
      url: "https://milkywayy.com/api/gpt/v1/bookings",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
    expect(mockBuildGptApiAuthorizationErrorResponse).toHaveBeenCalledWith(
      authError,
    );
    expect(mockFindAllBookings).not.toHaveBeenCalled();
  });
});
