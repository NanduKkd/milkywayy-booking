import Transaction from "@/lib/db/models/transaction";
import { auth } from "@/lib/helpers/auth";
import { ensureTransactionInvoiceUrl } from "@/lib/helpers/invoice";
import { getInvoices } from "../wallet";

jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/db/models/booking", () => ({}));
jest.mock("@/lib/db/models/transaction", () => ({
  findAll: jest.fn(),
}));
jest.mock("@/lib/db/models/wallettransaction", () => ({}));
jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/helpers/invoice", () => ({
  ensureTransactionInvoiceUrl: jest.fn(),
}));

describe("getInvoices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("backfills missing invoice URLs before returning paid invoices", async () => {
    auth.mockResolvedValue({ id: 7 });

    const transaction = {
      id: 3,
      userId: 7,
      invoiceUrl: null,
      toJSON() {
        return {
          id: this.id,
          userId: this.userId,
          invoiceUrl: this.invoiceUrl,
        };
      },
    };

    Transaction.findAll.mockResolvedValue([transaction]);
    ensureTransactionInvoiceUrl.mockImplementation(async (target) => {
      target.invoiceUrl = "https://example.com/invoice-3.pdf";
      return target.invoiceUrl;
    });

    const result = await getInvoices();

    expect(result.success).toBe(true);
    expect(ensureTransactionInvoiceUrl).toHaveBeenCalledWith(transaction);
    expect(result.data).toEqual([
      {
        id: 3,
        userId: 7,
        invoiceUrl: "https://example.com/invoice-3.pdf",
      },
    ]);
  });

  it("skips regeneration when the invoice URL already exists", async () => {
    auth.mockResolvedValue({ id: 7 });

    const transaction = {
      id: 4,
      userId: 7,
      invoiceUrl: "https://example.com/invoice-4.pdf",
      toJSON() {
        return {
          id: this.id,
          userId: this.userId,
          invoiceUrl: this.invoiceUrl,
        };
      },
    };

    Transaction.findAll.mockResolvedValue([transaction]);

    const result = await getInvoices();

    expect(result.success).toBe(true);
    expect(ensureTransactionInvoiceUrl).not.toHaveBeenCalled();
    expect(result.data).toEqual([
      {
        id: 4,
        userId: 7,
        invoiceUrl: "https://example.com/invoice-4.pdf",
      },
    ]);
  });
});
