/** @jest-environment node */

import {
  getPublicPropertyReceiptScope,
  resolvePublicPropertyShareFile,
} from "@/lib/services/propertySharing";
import {
  createDownloadUrl,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";
import { GET } from "../route";

jest.mock("@/lib/services/propertySharing", () => ({
  getPublicPropertyReceiptScope: jest.fn(),
  resolvePublicPropertyShareFile: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  createDownloadUrl: jest.fn(),
  parseOwnedBookingObjectUrl: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init = {}) => ({
      body,
      status: init.status || 200,
      headers: new Headers(init.headers),
      json: async () => body,
    })),
    redirect: jest.fn((url, init = {}) => ({
      status: init.status || 307,
      headers: new Headers({ ...init.headers, location: url }),
    })),
  },
}));

function request() {
  return {
    cookies: {
      get: jest.fn(() => ({ value: "signed-receipt" })),
    },
  };
}

const context = {
  params: Promise.resolve({
    token: "redacted",
    propertyId: "30",
    sharedFileId: "500",
  }),
};

describe("public property share file route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPublicPropertyReceiptScope.mockResolvedValue({
      shareId: 4,
      propertyId: 30,
    });
  });

  it("returns the generic 404 without a valid token/property scope", async () => {
    getPublicPropertyReceiptScope.mockResolvedValue(null);

    const response = await GET(request(), context);

    expect(response.status).toBe(404);
    expect(resolvePublicPropertyShareFile).not.toHaveBeenCalled();
  });

  it("authorizes the receipt and exact snapshot membership before short-lived delivery", async () => {
    resolvePublicPropertyShareFile.mockResolvedValue({
      url: "https://private-storage.invalid/object.zip",
      filename: "synthetic.zip",
    });
    parseOwnedBookingObjectUrl.mockReturnValue({
      key: "bookings/20/object.zip",
    });
    createDownloadUrl.mockResolvedValue(
      "https://signed-delivery.invalid/object.zip?temporary=1",
    );
    const req = request();

    const response = await GET(req, context);

    expect(req.cookies.get).toHaveBeenCalledWith("property-share-receipt-4-30");
    expect(resolvePublicPropertyShareFile).toHaveBeenCalledWith({
      token: "redacted",
      propertyId: "30",
      sharedFileId: "500",
      receiptToken: "signed-receipt",
    });
    expect(createDownloadUrl).toHaveBeenCalledWith({
      key: "bookings/20/object.zip",
      fileName: "synthetic.zip",
      expiresInSeconds: 300,
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain(
      "signed-delivery.invalid",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("location")).not.toContain(
      "private-storage.invalid",
    );
  });

  it("fails closed for an unselected or stale file membership", async () => {
    resolvePublicPropertyShareFile.mockResolvedValue(null);

    const response = await GET(request(), context);

    expect(response.status).toBe(404);
    expect(parseOwnedBookingObjectUrl).not.toHaveBeenCalled();
  });
});
