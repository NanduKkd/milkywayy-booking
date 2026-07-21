jest.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: jest.fn(),
  S3Client: jest.fn(() => ({ send: jest.fn() })),
}));

jest.mock("puppeteer", () => ({
  launch: jest.fn(),
}));

jest.mock("node:fs/promises", () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from("synthetic-asset")),
}));

jest.mock("@/lib/db/models/booking", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock("@/lib/db/models/user", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));
jest.mock("@/lib/helpers/numbering", () => ({
  ensureTransactionInvoiceNumber: jest.fn(),
}));

import puppeteer from "puppeteer";
import { Op } from "sequelize";
import Booking from "@/lib/db/models/booking";
import User from "@/lib/db/models/user";
import {
  buildBookingInvoiceItems,
  buildInvoiceCouponSummary,
  buildInvoiceDiscountSummaries,
  buildInvoiceHtml,
  ensureTransactionInvoiceUrl,
  generateAndUploadInvoice,
  INVOICE_TEMPLATE_VERSION,
  isTransactionInvoiceCurrent,
  resolveTransactionBookings,
} from "@/lib/helpers/invoice";
import { ensureTransactionInvoiceNumber } from "@/lib/helpers/numbering";
import { getPricingConfig } from "@/lib/helpers/pricing";

const invoiceNumber = "MW-2026-0721-001";
const resolvedBooking = { id: 12, userId: 7, total: 125 };
const mockPuppeteerLaunch = puppeteer.launch;
const mockBookingFindAll = Booking.findAll;
const mockBookingUpdate = Booking.update;
const mockUserFindByPk = User.findByPk;
const mockEnsureTransactionInvoiceNumber = ensureTransactionInvoiceNumber;
const mockGetPricingConfig = getPricingConfig;

beforeEach(() => {
  mockBookingFindAll.mockReset();
  mockBookingUpdate.mockReset().mockResolvedValue([1]);
  mockUserFindByPk.mockReset();
  mockEnsureTransactionInvoiceNumber.mockReset();
  mockGetPricingConfig.mockReset().mockResolvedValue({});
  mockPuppeteerLaunch.mockReset();
  mockEnsureTransactionInvoiceNumber.mockImplementation(
    async (transaction) => transaction.invoiceNumber,
  );
  mockPuppeteerLaunch.mockResolvedValue({
    newPage: async () => ({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from("invoice")),
    }),
    close: jest.fn(),
  });
  process.env.AWS_ACCESS_KEY_ID = "mock";
});

afterAll(() => {
  delete process.env.AWS_ACCESS_KEY_ID;
});

const invoicePricingConfig = {
  Apartment: {
    sizes: [
      {
        label: "1 Bed",
        prices: {
          Photography: { price: 800 },
          Videography: { "Short Form": { price: 500 } },
          "360° Tour": { price: 500 },
        },
      },
      {
        label: "2 Bed",
        prices: {
          Photography: { price: 900 },
          Videography: { "Long Form": { price: 550 } },
        },
      },
    ],
  },
};

const invoiceBookings = [
  {
    id: 1,
    bookingCode: "MWB-1001",
    total: 1800,
    propertyDetails: {
      type: "Apartment",
      size: "1 Bed",
      unit: "1204",
      building: "Marina Gate",
    },
    shootDetails: {
      services: ["Photography", "Videography", "360° Tour"],
      videographySubService: "Short Form",
    },
  },
  {
    id: 2,
    bookingCode: "MWB-1002",
    total: 1450,
    propertyDetails: {
      type: "Apartment",
      size: "2 Bed",
      unit: "508",
      building: "Palm Residence",
    },
    shootDetails: {
      services: ["Photography", "Videography"],
      videographySubService: "Long Form",
    },
  },
];

const invoiceTransaction = {
  id: "txn_synthetic_123",
  amount: 3000,
  paidAt: "2026-07-21T23:30:00.000Z",
  promotionSnapshot: {
    id: 1,
    kind: "AUTOMATIC",
    name: "Summer Savings",
    benefitAmount: 200.25,
  },
  couponDeduction: 49.75,
  metadata: { appliedCouponCode: "summer50" },
};

describe("buildBookingInvoiceItems", () => {
  it("splits each selected service into a separate invoice row", () => {
    const booking = {
      total: 2450,
      propertyDetails: {
        type: "Apartment",
        size: "1 Bed",
        community: "Downtown",
      },
      shootDetails: {
        services: ["Photography", "Videography", "360° Tour"],
        videographySubService: "Short Form",
      },
    };

    const pricingConfig = {
      Apartment: {
        sizes: [
          {
            label: "1 Bed",
            prices: {
              Photography: { price: 800 },
              Videography: {
                "Short Form": { price: 550 },
              },
              "360° Tour": 1100,
            },
          },
        ],
      },
    };

    expect(buildBookingInvoiceItems(booking, pricingConfig)).toEqual([
      { label: "Photography", amount: 800 },
      { label: "Videography - Short Form", amount: 550 },
      { label: "360° Tour", amount: 1100 },
    ]);
  });

  it("falls back to a single row when pricing details are unavailable", () => {
    const booking = {
      total: 900,
      shootDetails: {
        services: ["Photography", "Videography"],
        videographySubService: "Short Form",
      },
    };

    expect(buildBookingInvoiceItems(booking, {})).toEqual([
      { label: "Photography, Videography, Short Form", amount: 900 },
    ]);
  });
});

describe("buildInvoiceCouponSummary", () => {
  it("shows the applied coupon code and deduction", () => {
    expect(
      buildInvoiceCouponSummary({
        couponDeduction: "125.50",
        metadata: { appliedCouponCode: "save10" },
      }),
    ).toEqual({
      label: "Coupon (SAVE10)",
      amount: 125.5,
    });
  });

  it("omits the coupon row when no coupon deduction was applied", () => {
    expect(
      buildInvoiceCouponSummary({
        couponDeduction: 0,
        metadata: { appliedCouponCode: "SAVE10" },
      }),
    ).toBeNull();
  });
});

describe("buildInvoiceDiscountSummaries", () => {
  it("shows the selected promotion from the immutable transaction snapshot", () => {
    expect(
      buildInvoiceDiscountSummaries({
        amount: 550,
        promotionSnapshot: {
          id: 21,
          kind: "AUTOMATIC",
          name: "First-Shoot Launch Credit",
          benefitAmount: 500,
        },
      }),
    ).toEqual([
      { label: "Promotion (First-Shoot Launch Credit)", amount: 500 },
    ]);
  });

  it("shows stacked launch credit and coupon deductions", () => {
    expect(
      buildInvoiceDiscountSummaries({
        bulkDeduction: 500,
        couponDeduction: 55,
        metadata: {
          appliedLaunchPromoDeduction: 500,
          appliedCouponCode: "LOYAL10",
        },
      }),
    ).toEqual([
      { label: "First-Shoot Launch Credit", amount: 500 },
      { label: "Coupon (LOYAL10)", amount: 55 },
    ]);
  });
});

describe("isTransactionInvoiceCurrent", () => {
  const currentInvoiceNumber = "MW-2026-0607-001";
  const invoiceUrl = `https://example.com/invoices/Milkywayy_Invoice_${currentInvoiceNumber}_test-customer_2026-06-07_v3.pdf`;

  it("invalidates invoices generated with an older template", () => {
    expect(
      isTransactionInvoiceCurrent(
        {
          invoiceUrl,
          metadata: {
            invoiceBookingCount: 1,
            invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION - 1,
          },
        },
        currentInvoiceNumber,
        1,
      ),
    ).toBe(false);
  });

  it("keeps invoices generated with the current template", () => {
    expect(
      isTransactionInvoiceCurrent(
        {
          invoiceUrl,
          metadata: {
            invoiceBookingCount: 1,
            invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
          },
        },
        currentInvoiceNumber,
        1,
      ),
    ).toBe(true);
  });

  it("rejects invoice-number prefix collisions", () => {
    expect(
      isTransactionInvoiceCurrent(
        {
          invoiceUrl:
            "https://example.com/invoices/Milkywayy_Invoice_MW-2026-0607-0010_test-customer_2026-06-07_v3.pdf",
          metadata: {
            invoiceBookingCount: 1,
            invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
          },
        },
        currentInvoiceNumber,
        1,
      ),
    ).toBe(false);
  });
});

describe("resolveTransactionBookings", () => {
  it("returns directly associated bookings in database order without recovery writes", async () => {
    const directBookings = [
      { id: 3, transactionId: 81 },
      { id: 9, transactionId: 81 },
    ];
    mockBookingFindAll.mockResolvedValueOnce(directBookings);

    await expect(
      resolveTransactionBookings({ id: 81, userId: 7 }),
    ).resolves.toEqual(directBookings);

    expect(mockBookingFindAll).toHaveBeenCalledWith({
      where: { transactionId: 81, userId: 7 },
      order: [["id", "ASC"]],
    });
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it("recovers valid metadata booking IDs only for the transaction user", async () => {
    const recoveredBookings = [
      { id: 3, userId: 7, transactionId: 81 },
      { id: 9, userId: 7, transactionId: 81 },
    ];
    mockBookingFindAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(recoveredBookings);

    await expect(
      resolveTransactionBookings({
        id: 81,
        userId: 7,
        metadata: { bookingIds: [3, "9"] },
      }),
    ).resolves.toEqual(recoveredBookings);

    expect(mockBookingUpdate).toHaveBeenCalledTimes(1);
    const metadataUpdateWhere = mockBookingUpdate.mock.calls[0][1].where;
    expect(metadataUpdateWhere.id).toEqual([3, 9]);
    expect(metadataUpdateWhere.userId).toBe(7);
    expect(metadataUpdateWhere[Op.or]).toEqual([
      { transactionId: null },
      { transactionId: 81 },
    ]);
    const metadataReadWhere = mockBookingFindAll.mock.calls[1][0].where;
    expect(metadataReadWhere.id).toEqual([3, 9]);
    expect(metadataReadWhere.userId).toBe(7);
    expect(metadataReadWhere[Op.or]).toEqual([
      { transactionId: null },
      { transactionId: 81 },
    ]);
  });

  it("does not relink metadata bookings already attached to another transaction", async () => {
    mockBookingFindAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(
      resolveTransactionBookings({
        id: 81,
        userId: 7,
        metadata: { bookingIds: [3] },
      }),
    ).resolves.toEqual([]);

    const metadataUpdateWhere = mockBookingUpdate.mock.calls[0][1].where;
    expect(metadataUpdateWhere).toEqual(
      expect.objectContaining({ id: [3], userId: 7 }),
    );
    expect(metadataUpdateWhere[Op.or]).toEqual([
      { transactionId: null },
      { transactionId: 81 },
    ]);
    const metadataReadWhere = mockBookingFindAll.mock.calls[1][0].where;
    expect(metadataReadWhere).toEqual(
      expect.objectContaining({ id: [3], userId: 7 }),
    );
    expect(metadataReadWhere[Op.or]).toEqual([
      { transactionId: null },
      { transactionId: 81 },
    ]);
  });

  it("does not return a corrupt cross-user direct association", async () => {
    mockBookingFindAll.mockResolvedValueOnce([]);

    await expect(
      resolveTransactionBookings({ id: 81, userId: 7 }),
    ).resolves.toEqual([]);

    expect(mockBookingFindAll).toHaveBeenCalledWith({
      where: { transactionId: 81, userId: 7 },
      order: [["id", "ASC"]],
    });
  });

  it("recovers only one uniquely matching same-user amount subset", async () => {
    const candidates = [
      { id: 30, userId: 7, total: 75 },
      { id: 20, userId: 7, total: 50 },
      { id: 10, userId: 7, total: 40 },
    ];
    const recoveredBookings = [
      { id: 20, userId: 7, transactionId: 81, total: 50 },
      { id: 30, userId: 7, transactionId: 81, total: 75 },
    ];
    mockBookingFindAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(candidates)
      .mockResolvedValueOnce(recoveredBookings);

    await expect(
      resolveTransactionBookings({
        id: 81,
        userId: 7,
        amount: 125,
        createdAt: "2026-07-21T10:00:00.000Z",
      }),
    ).resolves.toEqual(recoveredBookings);

    const candidateQuery = mockBookingFindAll.mock.calls[1][0];
    expect(candidateQuery.where.userId).toBe(7);
    expect(candidateQuery.where.status[Op.in]).toEqual(["DRAFT", "CONFIRMED"]);
    expect(candidateQuery.where.createdAt[Op.between]).toEqual([
      new Date("2026-07-21T08:00:00.000Z"),
      new Date("2026-07-21T10:15:00.000Z"),
    ]);
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      { transactionId: 81, status: "CONFIRMED" },
      expect.objectContaining({
        where: expect.objectContaining({ id: [30, 20], userId: 7 }),
      }),
    );
    expect(mockBookingFindAll).toHaveBeenLastCalledWith({
      where: { id: [30, 20], userId: 7, transactionId: 81 },
      order: [["id", "ASC"]],
    });
  });

  it.each([
    [
      "ambiguous amount subsets",
      {
        id: 81,
        userId: 7,
        amount: 125,
        createdAt: "2026-07-21T10:00:00.000Z",
      },
      [
        { id: 1, total: 125 },
        { id: 2, total: 75 },
        { id: 3, total: 50 },
      ],
    ],
    [
      "a missing amount match",
      {
        id: 81,
        userId: 7,
        amount: 125,
        createdAt: "2026-07-21T10:00:00.000Z",
      },
      [{ id: 1, total: 80 }],
    ],
    [
      "cross-user candidates excluded by the ownership query",
      {
        id: 81,
        userId: 7,
        amount: 125,
        createdAt: "2026-07-21T10:00:00.000Z",
      },
      [],
    ],
  ])(
    "does not recover bookings for %s",
    async (_caseName, transaction, candidates) => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      mockBookingFindAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(candidates);

      await expect(resolveTransactionBookings(transaction)).resolves.toEqual(
        [],
      );

      expect(mockBookingUpdate).not.toHaveBeenCalled();
      if (_caseName.includes("cross-user")) {
        expect(mockBookingFindAll.mock.calls[1][0].where.userId).toBe(7);
      }
    },
  );

  it.each([
    ["an invalid timestamp", { createdAt: "not-a-date", amount: 125 }, 1],
    [
      "a missing user",
      { userId: null, createdAt: "2026-07-21T10:00:00.000Z", amount: 125 },
      0,
    ],
    ["a zero total", { createdAt: "2026-07-21T10:00:00.000Z", amount: 0 }, 1],
  ])(
    "does not query recovery candidates for %s",
    async (_caseName, overrides, expectedFindCalls) => {
      mockBookingFindAll.mockResolvedValueOnce([]);

      await expect(
        resolveTransactionBookings({ id: 81, userId: 7, ...overrides }),
      ).resolves.toEqual([]);

      expect(mockBookingFindAll).toHaveBeenCalledTimes(expectedFindCalls);
      expect(mockBookingUpdate).not.toHaveBeenCalled();
    },
  );
});

describe("ensureTransactionInvoiceUrl", () => {
  function transaction(overrides = {}) {
    return {
      id: 81,
      userId: 7,
      invoiceNumber,
      amount: 125,
      createdAt: "2026-07-21T10:00:00.000Z",
      metadata: { retained: "keep-me" },
      update: jest.fn().mockResolvedValue(),
      ...overrides,
    };
  }

  const user = { id: 7, fullName: "Test Customer", email: "customer@test" };

  it("returns a current invoice URL without rendering or persisting", async () => {
    const invoiceUrl = `https://example.com/invoices/Milkywayy_Invoice_${invoiceNumber}_test-customer_2026-07-21_v3.pdf`;
    const target = transaction({
      invoiceUrl,
      metadata: {
        invoiceBookingCount: 1,
        invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
      },
    });
    mockBookingFindAll.mockResolvedValueOnce([resolvedBooking]);

    await expect(ensureTransactionInvoiceUrl(target, user)).resolves.toBe(
      invoiceUrl,
    );

    expect(mockPuppeteerLaunch).not.toHaveBeenCalled();
    expect(target.update).not.toHaveBeenCalled();
  });

  it.each([
    [
      "an ambiguous booking subset",
      [
        { id: 1, total: 125 },
        { id: 2, total: 75 },
        { id: 3, total: 50 },
      ],
      "https://example.com/prior.pdf",
    ],
    ["no booking subset", [{ id: 1, total: 80 }], null],
  ])(
    "does not allocate, render, or persist invoice state for %s",
    async (_caseName, candidates, priorUrl) => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      const target = transaction({ invoiceUrl: priorUrl });
      mockBookingFindAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(candidates);

      await expect(ensureTransactionInvoiceUrl(target, user)).resolves.toBe(
        priorUrl,
      );

      expect(mockPuppeteerLaunch).not.toHaveBeenCalled();
      expect(mockEnsureTransactionInvoiceNumber).not.toHaveBeenCalled();
      expect(target.update).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "a stale template version",
      {
        invoiceUrl: `https://example.com/${invoiceNumber}.pdf`,
        metadata: {
          retained: "keep-me",
          invoiceBookingCount: 1,
          invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION - 1,
        },
      },
    ],
    [
      "a changed booking count",
      {
        invoiceUrl: `https://example.com/${invoiceNumber}.pdf`,
        metadata: {
          retained: "keep-me",
          invoiceBookingCount: 2,
          invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
        },
      },
    ],
    [
      "an invoice-number mismatch",
      {
        invoiceUrl: "https://example.com/MW-2026-0721-000.pdf",
        metadata: {
          retained: "keep-me",
          invoiceBookingCount: 1,
          invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
        },
      },
    ],
  ])("regenerates exactly once for %s", async (_caseName, staleFields) => {
    const target = transaction(staleFields);
    mockBookingFindAll.mockResolvedValueOnce([resolvedBooking]);

    const result = await ensureTransactionInvoiceUrl(target, user);

    expect(result).toContain(`Milkywayy_Invoice_${invoiceNumber}_`);
    expect(mockPuppeteerLaunch).toHaveBeenCalledTimes(1);
    expect(target.update).toHaveBeenCalledTimes(1);
    expect(target.update).toHaveBeenCalledWith({
      invoiceUrl: result,
      metadata: {
        retained: "keep-me",
        invoiceBookingCount: 1,
        invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
      },
    });
  });

  it("persists fresh metadata for a plain-object transaction fallback", async () => {
    const target = transaction({
      update: undefined,
      invoiceUrl: "https://example.com/stale.pdf",
      metadata: {
        retained: "keep-me",
        invoiceBookingCount: 1,
        invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION - 1,
      },
    });
    mockBookingFindAll.mockResolvedValueOnce([resolvedBooking]);

    const result = await ensureTransactionInvoiceUrl(target, user);

    expect(target.invoiceUrl).toBe(result);
    expect(target.metadata).toEqual({
      retained: "keep-me",
      invoiceBookingCount: 1,
      invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
    });
  });

  it("keeps ORM instance data values consistent with persisted metadata", async () => {
    const setDataValue = jest.fn();
    const target = transaction({
      invoiceUrl: "https://example.com/stale.pdf",
      metadata: {
        retained: "keep-me",
        invoiceBookingCount: 1,
        invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION - 1,
      },
      setDataValue,
    });
    mockBookingFindAll.mockResolvedValueOnce([resolvedBooking]);

    const result = await ensureTransactionInvoiceUrl(target, user);

    expect(setDataValue).toHaveBeenCalledWith("invoiceUrl", result);
    expect(setDataValue).toHaveBeenCalledWith("metadata", {
      retained: "keep-me",
      invoiceBookingCount: 1,
      invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
    });
  });

  it("fails safely when the transaction user cannot be resolved", async () => {
    const target = transaction({ invoiceUrl: null });
    mockBookingFindAll.mockResolvedValueOnce([resolvedBooking]);
    mockUserFindByPk.mockResolvedValueOnce(null);

    await expect(ensureTransactionInvoiceUrl(target)).resolves.toBeNull();

    expect(mockUserFindByPk).toHaveBeenCalledWith(7);
    expect(mockPuppeteerLaunch).not.toHaveBeenCalled();
    expect(target.update).not.toHaveBeenCalled();
  });

  it.each([
    ["a prior URL", "https://example.com/prior.pdf"],
    ["no prior URL", null],
  ])("preserves %s when rendering fails", async (_caseName, priorUrl) => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const target = transaction({ invoiceUrl: priorUrl });
    mockBookingFindAll.mockResolvedValueOnce([resolvedBooking]);
    mockPuppeteerLaunch.mockRejectedValueOnce(new Error("render failed"));

    await expect(ensureTransactionInvoiceUrl(target, user)).resolves.toBe(
      priorUrl,
    );

    expect(target.update).not.toHaveBeenCalled();
  });
});

describe("buildInvoiceHtml", () => {
  const invoiceNumber = "MW-2026-0721-007";
  const assets = {
    logoSrc: "data:image/png;base64,c3ludGhldGljLWxvZ28=",
    signatureSrc: "data:image/png;base64,c3ludGhldGljLXNpZ25hdHVyZQ==",
  };

  function buildHtml(overrides = {}) {
    return buildInvoiceHtml({
      transaction: invoiceTransaction,
      user: {
        companyName: "Acme Property Group LLC",
        billingAddress: "Suite 40\nDubai Media City",
        email: "billing@acme.example",
        phone: "+971 50 000 0000",
        trn: "TRN-123456789",
      },
      bookings: invoiceBookings,
      pricingConfig: invoicePricingConfig,
      assets,
      invoiceNumber,
      ...overrides,
    });
  }

  it("renders the complete semantic invoice contract for multiple bookings", () => {
    const html = buildHtml();

    expect(html).toContain("<strong>Invoice No:</strong> MW-2026-0721-007");
    expect(html).toContain("<strong>Invoice Date:</strong> 21/07/2026");
    expect(html).toContain("<strong>Booking IDs:</strong> MWB-1001, MWB-1002");
    expect(html).toContain("Acme Property Group LLC");
    expect(html).toContain("Suite 40<br/>Dubai Media City");
    expect(html).toContain("billing@acme.example");
    expect(html).toContain("+971 50 000 0000");
    expect(html).toContain("TRN-123456789");

    expect(html).toContain("1204, Marina Gate - 1BR");
    expect(html).toContain("Booking ID: MWB-1001");
    expect(html).toContain("Videography - (Short-Form Reel)");
    expect(html).toContain("360° Virtual Tour");
    expect(html).toContain("508, Palm Residence - 2BR");
    expect(html).toContain("Booking ID: MWB-1002");
    expect(html).toContain("Videography - (Long-Form)");

    expect(html).toContain("<td>Sub-Total</td>\n    <td>AED 3250</td>");
    expect(html).toContain("Promotion (Summer Savings)");
    expect(html).toContain("- AED 200.25");
    expect(html).toContain("Coupon (SUMMER50)");
    expect(html).toContain("- AED 49.75");
    expect(html).toContain("<td>Tax (0%)</td>\n    <td>AED 0.00</td>");
    expect(html).toContain("<td>Total</td>\n    <td>AED 3000.00</td>");
    expect(html).toContain("<strong>Payment Method:</strong> Stripe");
    expect(html).toContain(
      "<strong>Transaction ID:</strong> txn_synthetic_123",
    );
    expect(html).toContain("MILKYWAYY LLC");
    expect(html).toContain("Thank you for booking with Milkywayy.");
    expect(html).toContain("Founder & CEO");
  });

  it("uses the singular booking label and individual bill-to identity", () => {
    const html = buildHtml({
      user: {
        fullName: "Synthetic Individual",
        address: "One Test Road",
        email: "individual@example.test",
      },
      bookings: [invoiceBookings[0]],
    });

    expect(html).toContain("<strong>Booking ID:</strong> MWB-1001");
    expect(html).not.toContain("<strong>Booking IDs:</strong>");
    expect(html).toContain("<strong>Synthetic Individual</strong>");
    expect(html).toContain("One Test Road");
  });

  it("escapes every customer-controlled value while preserving multiline addresses", () => {
    const unsafe = `<script>&"'`;
    const html = buildHtml({
      transaction: {
        ...invoiceTransaction,
        id: `transaction-${unsafe}`,
        metadata: { appliedCouponCode: `coupon-${unsafe}` },
        promotionSnapshot: {
          ...invoiceTransaction.promotionSnapshot,
          name: `promotion-${unsafe}`,
        },
      },
      user: {
        companyName: `company-${unsafe}`,
        billingAddress: `address-${unsafe}\nsecond-${unsafe}`,
        email: `email-${unsafe}`,
        phone: `phone-${unsafe}`,
        trn: `trn-${unsafe}`,
      },
      bookings: [
        {
          ...invoiceBookings[0],
          bookingCode: `booking-${unsafe}`,
          propertyDetails: {
            ...invoiceBookings[0].propertyDetails,
            unit: `unit-${unsafe}`,
          },
          shootDetails: {
            ...invoiceBookings[0].shootDetails,
            services: [`service-${unsafe}`],
          },
        },
      ],
      invoiceNumber: `invoice-${unsafe}`,
    });

    const escaped = "&lt;script&gt;&amp;&quot;&#39;";
    expect(html).toContain(`invoice-${escaped}`);
    expect(html).toContain(`company-${escaped}`);
    expect(html).toContain(`address-${escaped}<br/>second-${escaped}`);
    expect(html).toContain(`email-${escaped}`);
    expect(html).toContain(`phone-${escaped}`);
    expect(html).toContain(`trn-${escaped}`);
    expect(html).toContain(`booking-${escaped}`);
    expect(html).toContain(`unit-${escaped}`);
    expect(html).toContain(`service-${escaped}`);
    expect(html).toContain(`promotion-${escaped}`);
    expect(html).toContain(`COUPON-${escaped.replace("script", "SCRIPT")}`);
    expect(html).toContain(`transaction-${escaped}`);
    expect(html).not.toContain(`<script>&"'`);
  });

  it("passes the pure builder output directly to Puppeteer", async () => {
    const page = {
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from("synthetic-pdf")),
    };
    const browser = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(),
    };
    puppeteer.launch.mockResolvedValue(browser);
    getPricingConfig.mockResolvedValue(invoicePricingConfig);

    const priorAccessKey = process.env.AWS_ACCESS_KEY_ID;
    process.env.AWS_ACCESS_KEY_ID = "mock";
    try {
      await expect(
        generateAndUploadInvoice(
          invoiceTransaction,
          {
            companyName: "Acme Property Group LLC",
            billingAddress: "Suite 40\nDubai Media City",
            email: "billing@acme.example",
            phone: "+971 50 000 0000",
            trn: "TRN-123456789",
          },
          invoiceNumber,
          invoiceBookings,
        ),
      ).resolves.toContain(invoiceNumber);
    } finally {
      if (priorAccessKey === undefined) delete process.env.AWS_ACCESS_KEY_ID;
      else process.env.AWS_ACCESS_KEY_ID = priorAccessKey;
    }

    expect(page.setContent).toHaveBeenCalledWith(
      buildHtml({
        assets: {
          logoSrc: "data:image/png;base64,c3ludGhldGljLWFzc2V0",
          signatureSrc: "data:image/png;base64,c3ludGhldGljLWFzc2V0",
        },
      }),
    );
  });
});
