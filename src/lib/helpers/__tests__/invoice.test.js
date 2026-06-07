jest.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: jest.fn(),
  S3Client: jest.fn(() => ({ send: jest.fn() })),
}));

jest.mock("puppeteer", () => ({
  launch: jest.fn(),
}));

jest.mock("@/lib/db/models/booking", () => ({}));
jest.mock("@/lib/db/models/user", () => ({}));
jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

import {
  buildBookingInvoiceItems,
  buildInvoiceCouponSummary,
  buildInvoiceDiscountSummaries,
  INVOICE_TEMPLATE_VERSION,
  isTransactionInvoiceCurrent,
} from "@/lib/helpers/invoice";

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
  const invoiceNumber = "MW-2026-0607-001";
  const invoiceUrl = `https://example.com/${invoiceNumber}.pdf`;

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
        invoiceNumber,
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
        invoiceNumber,
        1,
      ),
    ).toBe(true);
  });
});
