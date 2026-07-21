/** @jest-environment node */

import { submitPublicPropertyShareContact } from "@/lib/services/propertySharing";
import { POST } from "../route";

jest.mock("@/lib/services/propertySharing", () => ({
  submitPublicPropertyShareContact: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init = {}) => ({
      body,
      status: init.status || 200,
      headers: new Headers(init.headers),
      cookies: { set: jest.fn() },
      json: async () => body,
    })),
  },
}));

function request({ origin = "https://example.test", body } = {}) {
  return {
    url: "https://example.test/api/public/property-shares/redacted/properties/30/contact",
    headers: new Headers({
      origin,
      "content-type": "application/json",
      "x-forwarded-for": "192.0.2.4",
    }),
    json: jest
      .fn()
      .mockResolvedValue(
        body || { name: "Synthetic Visitor", phone: "+971500000000" },
      ),
  };
}

describe("public property share contact route", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects cross-origin submissions before reading contact input", async () => {
    const req = request({ origin: "https://attacker.test" });

    const response = await POST(req, {
      params: Promise.resolve({ token: "redacted", propertyId: "30" }),
    });

    expect(response.status).toBe(403);
    expect(req.json).not.toHaveBeenCalled();
    expect(submitPublicPropertyShareContact).not.toHaveBeenCalled();
  });

  it("rejects non-JSON contact submissions before parsing input", async () => {
    const req = request();
    req.headers.set("content-type", "text/plain");

    const response = await POST(req, {
      params: Promise.resolve({ token: "redacted", propertyId: "30" }),
    });

    expect(response.status).toBe(415);
    expect(req.json).not.toHaveBeenCalled();
    expect(submitPublicPropertyShareContact).not.toHaveBeenCalled();
  });

  it("sets an HttpOnly scoped receipt without echoing contact or token data", async () => {
    submitPublicPropertyShareContact.mockResolvedValue({
      receipt: {
        cookieName: "property-share-receipt-4-30",
        token: "signed-receipt",
        maxAge: 86_400,
      },
    });
    const req = request();

    const response = await POST(req, {
      params: Promise.resolve({ token: "redacted", propertyId: "30" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.cookies.set).toHaveBeenCalledWith(
      "property-share-receipt-4-30",
      "signed-receipt",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 86_400,
        path: "/",
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain("Synthetic Visitor");
    expect(JSON.stringify(response.body)).not.toContain("redacted");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("uses the same generic 404 shape for invalid public scope", async () => {
    submitPublicPropertyShareContact.mockResolvedValue(null);

    const response = await POST(request(), {
      params: Promise.resolve({ token: "redacted", propertyId: "30" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });
});
