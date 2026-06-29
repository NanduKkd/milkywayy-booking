const { Op } = require("sequelize");

const mockAuthenticateGptApiRequest = jest.fn();
const mockBuildGptApiAuthorizationErrorResponse = jest.fn();
const mockFindAllDeliveryFiles = jest.fn();

jest.mock("@/lib/db/models", () => ({
  Booking: {
    name: "Booking",
  },
  BookingDeliveryFile: {
    findAll: (...args) => mockFindAllDeliveryFiles(...args),
  },
  BookingDeliveryFileVersion: {
    name: "BookingDeliveryFileVersion",
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

describe("GPT API delivery files list route", () => {
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

  it("returns customer-scoped delivery-file metadata with safe links and pagination", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 9,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindAllDeliveryFiles.mockResolvedValue([
      {
        id: 18,
        label: "Exterior photo set",
        type: "Photography",
        status: "UNDER_REVIEW",
        revisionCount: 1,
        reviewDeadlineAt: "2026-07-01T08:00:00.000Z",
        createdAt: "2026-06-29T09:05:00.000Z",
        booking: {
          bookingCode: null,
          id: 10,
        },
        currentVersion: {
          originalFilename: "front-elevation.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1048576,
          uploadedAt: "2026-06-29T09:00:00.000Z",
          url: "https://bucket.example.com/private/front-elevation.jpg",
        },
      },
      {
        id: 17,
        label: "Walkthrough video",
        type: "Videography",
        status: "ACCEPTED",
        revisionCount: 0,
        reviewDeadlineAt: null,
        createdAt: "2026-06-28T12:00:00.000Z",
        booking: {
          bookingCode: "MWB-1008",
          id: 8,
        },
        currentVersion: {
          originalFilename: "walkthrough.mp4",
          mimeType: "video/mp4",
          sizeBytes: 2048,
          uploadedAt: "2026-06-28T11:55:00.000Z",
        },
      },
    ]);

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer oauth-access-token",
      }),
      url: "https://milkywayy.com/api/gpt/v1/files?bookingCode=MWB-1010&fileId=18&limit=1&status=UNDER_REVIEW&type=Photography&uploadedFrom=2026-06-01&uploadedTo=2026-06-30",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      files: [
        {
          bookingCode: "MWB-1010",
          fileId: 18,
          fileName: "front-elevation.jpg",
          label: "Exterior photo set",
          mimeType: "image/jpeg",
          reviewDeadlineAt: "2026-07-01T08:00:00.000Z",
          revisionCount: 1,
          sizeBytes: 1048576,
          status: "UNDER_REVIEW",
          type: "Photography",
          uploadedAt: "2026-06-29T09:00:00.000Z",
          websiteUrl: "/dashboard/files?fileId=18",
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
    expect(mockFindAllDeliveryFiles).toHaveBeenCalledWith({
      attributes: [
        "id",
        "label",
        "type",
        "status",
        "revisionCount",
        "reviewDeadlineAt",
        "createdAt",
      ],
      include: [
        {
          attributes: ["id", "bookingCode"],
          as: "booking",
          model: {
            name: "Booking",
          },
          required: true,
          where: expect.any(Object),
        },
        {
          attributes: [
            "id",
            "originalFilename",
            "mimeType",
            "sizeBytes",
            "uploadedAt",
          ],
          as: "currentVersion",
          model: {
            name: "BookingDeliveryFileVersion",
          },
          required: true,
          where: {
            uploadedAt: {
              [Op.gte]: "2026-06-01T00:00:00.000Z",
              [Op.lte]: "2026-06-30T23:59:59.999Z",
            },
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

    const query = mockFindAllDeliveryFiles.mock.calls[0][0];
    expect(query.where[Op.and]).toEqual(
      expect.arrayContaining([
        {
          status: {
            [Op.in]: ["UNDER_REVIEW", "ACCEPTED"],
          },
        },
        { id: 18 },
        { status: "UNDER_REVIEW" },
        { type: "Photography" },
      ]),
    );
    expect(query.include[0].where[Op.and]).toEqual(
      expect.arrayContaining([
        { userId: 42 },
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
      url: "https://milkywayy.com/api/gpt/v1/files?fileId=abc",
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      details: expect.any(Array),
      error: "invalid_request",
    });
    expect(mockFindAllDeliveryFiles).not.toHaveBeenCalled();
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
      url: "https://milkywayy.com/api/gpt/v1/files",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
    expect(mockBuildGptApiAuthorizationErrorResponse).toHaveBeenCalledWith(
      authError,
    );
    expect(mockFindAllDeliveryFiles).not.toHaveBeenCalled();
  });
});
