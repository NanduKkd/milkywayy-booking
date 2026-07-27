/** @jest-environment node */

import * as security from "../propertySharingSecurity";

function listing(overrides = {}) {
  return {
    listingTitle: "Corner home with marina view",
    priceAed: "2,350,000",
    listingType: "FOR_SALE",
    bathrooms: "3.5",
    maidRoom: true,
    sizeSqft: "1,244",
    builtUpAreaSqft: "1,100",
    plotAreaSqft: "1,800",
    furnishing: "FURNISHED",
    description: "Bright corner home.\nVacant on transfer.",
    highlights: ["Full marina view", "Upgraded kitchen"],
    contactName: "Synthetic Owner",
    contactPhone: "+971 50 000 0000",
    ...overrides,
  };
}

describe("property sharing security helpers", () => {
  it("creates stable opaque 256-bit public identifiers", () => {
    const publicId = security.createPropertyShareId();

    expect(publicId).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(Buffer.from(publicId, "base64url")).toHaveLength(32);
    expect(security.isPropertyShareId(publicId)).toBe(true);
    expect(security.isPropertyShareId("malformed")).toBe(false);
    expect(security).not.toHaveProperty("digestPropertyShareToken");
    expect(security).not.toHaveProperty("tokenDigestMatches");
  });

  it("normalizes and bounds every owner-authored listing field", () => {
    expect(security.normalizePropertyShareListing(listing())).toEqual({
      listingTitle: "Corner home with marina view",
      priceAed: "2350000.00",
      listingType: "FOR_SALE",
      propertyType: "APARTMENT",
      bathrooms: "3.5",
      maidRoom: true,
      sizeSqft: 1244,
      builtUpAreaSqft: 1100,
      plotAreaSqft: 1800,
      furnishing: "FURNISHED",
      description: "Bright corner home.\nVacant on transfer.",
      highlights: ["Full marina view", "Upgraded kitchen"],
      contactName: "Synthetic Owner",
      contactPhone: "+971500000000",
    });
  });

  it("accepts half bathrooms and clears residential-only fields for commercial listings", () => {
    expect(
      security.normalizePropertyShareListing(
        listing({
          propertyType: "commercial",
          bathrooms: "4.5",
          maidRoom: true,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        propertyType: "COMMERCIAL",
        bathrooms: null,
        maidRoom: false,
      }),
    );
    expect(() =>
      security.normalizePropertyShareListing(listing({ bathrooms: "3.25" })),
    ).toThrow(security.PropertyShareInputError);
  });

  it.each([
    ["unknown key", { unexpected: "value" }],
    ["invalid price", { priceAed: "free" }],
    ["invalid listing type", { listingType: "AUCTION" }],
    ["unsupported furnishing", { furnishing: "PART_FURNISHED" }],
    ["invalid size", { sizeSqft: "0" }],
    ["invalid contact phone", { contactPhone: "123" }],
    [
      "too many highlights",
      {
        highlights: Array.from(
          { length: 13 },
          (_, index) => `Amenity ${index}`,
        ),
      },
    ],
  ])("rejects %s", (_label, overrides) => {
    expect(() =>
      security.normalizePropertyShareListing(listing(overrides)),
    ).toThrow(security.PropertyShareInputError);
  });

  it("deduplicates highlights and generates encoded contact actions", () => {
    const normalized = security.normalizePropertyShareListing(
      listing({ highlights: ["Pool", "pool", "Gym"] }),
    );
    expect(normalized.highlights).toEqual(["Pool", "Gym"]);
    expect(security.propertyShareContactLinks("+971 50 000 0000")).toEqual({
      telephone: "tel:+971500000000",
      whatsapp: "https://wa.me/971500000000",
    });
  });

  it("exports no receipt, cookie, throttle, or visitor-contact flow", () => {
    expect(security).not.toHaveProperty("createPropertyShareReceipt");
    expect(security).not.toHaveProperty("verifyPropertyShareReceipt");
    expect(security).not.toHaveProperty("normalizePropertyShareContact");
    expect(security).not.toHaveProperty("enforcePropertyShareContactThrottle");
  });
});
