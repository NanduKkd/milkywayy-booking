const mockNextResponseJson = jest.fn((data, init) => ({
  body: data,
  status: init?.status || 200,
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: (...args) => mockNextResponseJson(...args),
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findByPk: jest.fn(),
    },
  },
}));

import { AuthorizationError } from "../authorization";
import { authorizationErrorResponse } from "../routeAuthorization";

describe("route authorization response adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ["Unauthorized", 401],
    ["Forbidden", 403],
  ])("maps a typed %s error to an HTTP response", (message, status) => {
    const response = authorizationErrorResponse(
      new AuthorizationError(message, status),
    );

    expect(response).toEqual({
      body: { error: message },
      status,
    });
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: message },
      { status },
    );
  });

  it("leaves non-authorization failures to the route's existing handler", () => {
    expect(authorizationErrorResponse(new Error("Database unavailable"))).toBe(
      null,
    );
    expect(mockNextResponseJson).not.toHaveBeenCalled();
  });
});
