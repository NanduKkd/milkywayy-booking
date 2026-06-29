const { Op } = require("sequelize");

const mockAuthenticateGptApiRequest = jest.fn();
const mockBuildGptApiAuthorizationErrorResponse = jest.fn();
const mockFindOneBooking = jest.fn();

jest.mock("@/lib/db/models", () => ({
  Booking: {
    findOne: (...args) => mockFindOneBooking(...args),
  },
}));

jest.mock("../../../_lib/auth", () => {
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

const { GptApiAuthorizationError } = require("../../../_lib/auth");
const { GET } = require("../route");

describe("GPT API booking detail route", () => {
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

  it("returns one customer-owned booking by its public booking code", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 9,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindOneBooking.mockResolvedValue({
      id: 10,
      bookingCode: null,
      status: "CONFIRMED",
      workflowStatus: "FILES_UPLOADED",
      shootDetails: {
        services: ["Photography", "Videography"],
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
    });

    const response = await GET(
      {
        headers: new Headers({
          authorization: "Bearer oauth-access-token",
        }),
      },
      {
        params: Promise.resolve({
          bookingCode: "MWB-1010",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
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
    });
    expect(mockFindOneBooking).toHaveBeenCalledWith({
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
      where: {
        [Op.and]: [
          { userId: 42 },
          {
            [Op.or]: [
              { bookingCode: "MWB-1010" },
              { bookingCode: null, id: 10 },
            ],
          },
        ],
      },
    });
  });

  it("returns not_found for unavailable or other-customer bookings", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 9,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindOneBooking.mockResolvedValue(null);

    const response = await GET(
      {
        headers: new Headers({
          authorization: "Bearer oauth-access-token",
        }),
      },
      {
        params: Promise.resolve({
          bookingCode: "MWB-1010",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
    });
  });

  it("returns not_found for malformed booking identifiers without querying the database", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 9,
      customerId: 42,
      scopes: ["customer:read"],
    });

    const response = await GET(
      {
        headers: new Headers({
          authorization: "Bearer oauth-access-token",
        }),
      },
      {
        params: Promise.resolve({
          bookingCode: "not-a-booking-code",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
    });
    expect(mockFindOneBooking).not.toHaveBeenCalled();
  });

  it("returns the shared authorization error response for invalid bearer tokens", async () => {
    const authError = new GptApiAuthorizationError({
      code: "invalid_token",
      reasonCode: "access_token_revoked",
      statusCode: 401,
    });
    mockAuthenticateGptApiRequest.mockRejectedValue(authError);

    const response = await GET(
      {
        headers: new Headers({
          authorization: "Bearer revoked-token",
        }),
      },
      {
        params: Promise.resolve({
          bookingCode: "MWB-1010",
        }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
    expect(mockBuildGptApiAuthorizationErrorResponse).toHaveBeenCalledWith(
      authError,
    );
    expect(mockFindOneBooking).not.toHaveBeenCalled();
  });
});
