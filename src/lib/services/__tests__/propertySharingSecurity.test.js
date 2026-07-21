/** @jest-environment node */

import jwt from "jsonwebtoken";
import {
  createPropertyShareReceipt,
  createPropertyShareToken,
  digestPropertyShareToken,
  enforcePropertyShareContactThrottle,
  getPropertyShareReceiptCookieName,
  isSameOriginPropertyShareRequest,
  normalizePropertyShareContact,
  PropertyShareInputError,
  PropertyShareRateLimitError,
  resetPropertyShareThrottleForTests,
  tokenDigestMatches,
  verifyPropertyShareReceipt,
} from "../propertySharingSecurity";

describe("property sharing security helpers", () => {
  beforeEach(() => {
    resetPropertyShareThrottleForTests();
  });

  it("creates 256-bit base64url tokens and stores a one-way digest", () => {
    const token = createPropertyShareToken();
    const digest = digestPropertyShareToken(token);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(digest).toMatch(/^[0-9a-f]{64}$/u);
    expect(digest).not.toContain(token);
    expect(tokenDigestMatches(digest, digest)).toBe(true);
    expect(digestPropertyShareToken("malformed")).toBeNull();
  });

  it("accepts exactly normalized name and phone and rejects extra fields", () => {
    expect(
      normalizePropertyShareContact({
        name: "  Synthetic   Visitor ",
        phone: "00 971 (50) 123-4567",
      }),
    ).toEqual({ name: "Synthetic Visitor", phone: "+971501234567" });
    expect(() =>
      normalizePropertyShareContact({
        name: "Synthetic Visitor",
        phone: "+971501234567",
        company: "Agency",
      }),
    ).toThrow(PropertyShareInputError);
    expect(() =>
      normalizePropertyShareContact({
        name: "Synthetic Visitor",
        phone: "invalid",
      }),
    ).toThrow("Enter a valid phone number");
  });

  it("issues a PII-free receipt scoped to share, property, version, and 24 hours", async () => {
    const now = new Date("2026-07-22T10:00:00.000Z");
    const receipt = await createPropertyShareReceipt({
      shareId: 4,
      propertyId: 9,
      credentialVersion: 2,
      now,
    });
    const payload = jwt.decode(receipt.token);

    expect(receipt.cookieName).toBe("property-share-receipt-4-9");
    expect(receipt.maxAge).toBe(86_400);
    expect(payload).toEqual(
      expect.objectContaining({
        sid: 4,
        pid: 9,
        cv: 2,
        iat: Math.floor(now.getTime() / 1000),
      }),
    );
    expect(payload.exp - payload.iat).toBe(86_400);
    expect(payload.name).toBeUndefined();
    expect(payload.phone).toBeUndefined();
    await expect(
      verifyPropertyShareReceipt(receipt.token, {
        shareId: 4,
        propertyId: 9,
        credentialVersion: 2,
        now: new Date("2026-07-23T09:59:59.000Z"),
      }),
    ).resolves.toBe(true);
    await expect(
      verifyPropertyShareReceipt(receipt.token, {
        shareId: 4,
        propertyId: 10,
        credentialVersion: 2,
        now,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyPropertyShareReceipt(receipt.token, {
        shareId: 4,
        propertyId: 9,
        credentialVersion: 3,
        now,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyPropertyShareReceipt(receipt.token, {
        shareId: 4,
        propertyId: 9,
        credentialVersion: 2,
        now: new Date("2026-07-23T10:00:00.000Z"),
      }),
    ).resolves.toBe(false);
  });

  it("bounds contact attempts with only an ephemeral keyed network digest", () => {
    const options = {
      shareId: 1,
      propertyId: 2,
      networkAddress: "192.0.2.44",
      now: new Date("2026-07-22T10:00:00.000Z"),
    };
    for (let index = 0; index < 8; index += 1) {
      expect(() => enforcePropertyShareContactThrottle(options)).not.toThrow();
    }
    expect(() => enforcePropertyShareContactThrottle(options)).toThrow(
      PropertyShareRateLimitError,
    );
    expect(() =>
      enforcePropertyShareContactThrottle({
        ...options,
        networkAddress: "192.0.2.45",
      }),
    ).not.toThrow();
  });

  it("requires a matching Origin for the public contact mutation", () => {
    const request = {
      url: "https://example.test/api/public/property-shares/token/contact",
      headers: new Headers({ origin: "https://example.test" }),
    };
    expect(isSameOriginPropertyShareRequest(request)).toBe(true);
    request.headers.set("origin", "https://attacker.test");
    expect(isSameOriginPropertyShareRequest(request)).toBe(false);
    expect(getPropertyShareReceiptCookieName(4, 9)).toBe(
      "property-share-receipt-4-9",
    );
  });
});
