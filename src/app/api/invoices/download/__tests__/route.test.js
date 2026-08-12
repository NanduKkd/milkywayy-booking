import Transaction from "@/lib/db/models/transaction";
import { requireInvoiceDownloadActor } from "@/lib/helpers/authorization";
import {
  createInvoiceDownloadUrl,
  parseOwnedInvoiceObjectUrl,
} from "@/lib/storage/s3";
import { GET } from "../route";

jest.mock("@/lib/db/models/transaction", () => ({ findOne: jest.fn() }));
jest.mock("@/lib/helpers/authorization", () => ({
  requireInvoiceDownloadActor: jest.fn(),
  getAuthorizationErrorStatus: (error) => error.authorizationStatus ?? null,
}));
jest.mock("@/lib/storage/s3", () => ({
  createInvoiceDownloadUrl: jest.fn(),
  parseOwnedInvoiceObjectUrl: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
    redirect: jest.fn((url, init) => ({
      status: init?.status || 307,
      headers: { get: (name) => (name === "location" ? url : null) },
    })),
  },
}));

describe("invoice download route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireInvoiceDownloadActor.mockResolvedValue({
      id: 34,
      role: "CUSTOMER",
    });
    Transaction.findOne.mockResolvedValue({
      id: 55,
      userId: 34,
      invoiceNumber: "MW-2026-0618-001",
      invoiceUrl:
        "https://milkywayy.s3.amazonaws.com/invoices/Milkywayy_Invoice.pdf",
    });
    parseOwnedInvoiceObjectUrl.mockReturnValue({
      bucket: "milkywayy",
      key: "invoices/Milkywayy_Invoice.pdf",
    });
    createInvoiceDownloadUrl.mockResolvedValue(
      "https://milkywayy.s3.amazonaws.com/invoices/Milkywayy_Invoice.pdf?signed=1",
    );
  });

  it("requires authentication", async () => {
    requireInvoiceDownloadActor.mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { authorizationStatus: 401 }),
    );
    const response = await GET({
      url: "http://localhost/api/invoices/download?transactionId=55",
    });
    expect(response.status).toBe(401);
    expect(Transaction.findOne).not.toHaveBeenCalled();
  });

  it("rejects a database actor without invoice access before querying transactions", async () => {
    requireInvoiceDownloadActor.mockRejectedValue(
      Object.assign(new Error("Forbidden"), { authorizationStatus: 403 }),
    );

    const response = await GET({
      url: "http://localhost/api/invoices/download?transactionId=55",
    });

    expect(response.status).toBe(403);
    expect(Transaction.findOne).not.toHaveBeenCalled();
  });

  it("checks customer ownership and redirects to a signed invoice", async () => {
    const response = await GET({
      url: "http://localhost/api/invoices/download?transactionId=55",
    });

    expect(Transaction.findOne).toHaveBeenCalledWith({
      where: { id: 55, userId: 34 },
    });
    expect(createInvoiceDownloadUrl).toHaveBeenCalledWith({
      key: "invoices/Milkywayy_Invoice.pdf",
      fileName: "Milkywayy_MW-2026-0618-001.pdf",
    });
    expect(response.status).toBe(302);
  });

  it("does not expose another customer's invoice", async () => {
    Transaction.findOne.mockResolvedValue(null);
    const response = await GET({
      url: "http://localhost/api/invoices/download?transactionId=55",
    });
    expect(response.status).toBe(404);
    expect(createInvoiceDownloadUrl).not.toHaveBeenCalled();
  });

  it("allows an admin to download by transaction id", async () => {
    requireInvoiceDownloadActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });

    const response = await GET({
      url: "http://localhost/api/invoices/download?transactionId=55",
    });

    expect(Transaction.findOne).toHaveBeenCalledWith({ where: { id: 55 } });
    expect(response.status).toBe(302);
  });
});
