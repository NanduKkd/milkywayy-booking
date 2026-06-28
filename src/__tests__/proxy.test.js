/** @jest-environment node */

import { jwtVerify } from "jose";
import { proxy } from "@/proxy";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

function createRequest(url, token) {
  return {
    cookies: {
      get: jest.fn(() => (token ? { value: token } : undefined)),
    },
    nextUrl: new URL(url),
    url,
  };
}

describe("proxy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows anonymous users to open the dashboard entry route", async () => {
    const response = await proxy(
      createRequest("https://example.com/dashboard"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects anonymous nested dashboard routes back to /dashboard with next", async () => {
    const response = await proxy(
      createRequest("https://example.com/dashboard/files?filter=ready"),
    );

    expect(response.headers.get("location")).toBe(
      "https://example.com/dashboard?next=%2Fdashboard%2Ffiles%3Ffilter%3Dready",
    );
  });

  it("does not treat unrelated paths as dashboard routes", async () => {
    const response = await proxy(
      createRequest("https://example.com/dashboarding"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps customer users away from admin routes", async () => {
    jwtVerify.mockResolvedValue({ payload: { role: "CUSTOMER" } });

    const response = await proxy(
      createRequest("https://example.com/admin/bookings", "valid-token"),
    );

    expect(response.headers.get("location")).toBe(
      "https://example.com/dashboard",
    );
  });

  it("redirects admin users from dashboard routes to /admin", async () => {
    jwtVerify.mockResolvedValue({ payload: { role: "STAFF" } });

    const response = await proxy(
      createRequest("https://example.com/dashboard/files", "valid-token"),
    );

    expect(response.headers.get("location")).toBe("https://example.com/admin");
  });
});
