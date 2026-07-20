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

  const pricingConfig = {
    Apartment: {
      sizes: [
        {
          label: "1 Bed",
          prices: {
            Photography: { price: 100 },
            Floor_Plan: 125,
            Zero_Price: 0,
            Malformed_Price: { price: "not-a-number" },
            Videography: {
              "Short Form": 199.995,
              "Long Form": {
                "Daylight + Night": { price: 300.5 },
              },
            },
            "360° Tour": 75.25,
          },
        },
      ],
    },
  };

  it.each([
    [
      "uses nested and pipe-delimited videography selections",
      {
        total: 500.5,
        propertyDetails: { propertyType: "Apartment", propertySize: "1 Bed" },
        shootDetails: {
          services: ["Videography"],
          videographySubService: "Long Form.Daylight + Night|Short Form",
        },
      },
      [
        { label: "Videography - Long Form - Daylight + Night", amount: 300.5 },
        { label: "Videography - Short Form", amount: 200 },
      ],
    ],
    [
      "prefers the legacy property videography selection over shoot details",
      {
        total: 300.5,
        propertyDetails: {
          type: "Apartment",
          size: "1 Bed",
          videographySubService: "Long Form.Daylight + Night",
        },
        shootDetails: {
          services: ["Videography"],
          videographySubService: "Short Form",
        },
      },
      [
        {
          label: "Videography - Long Form - Daylight + Night",
          amount: 300.5,
        },
      ],
    ],
    [
      "supports legacy root property fields and underscored service labels",
      {
        total: 125,
        propertyType: "Apartment",
        propertySize: "1 Bed",
        shootDetails: { services: ["Floor_Plan"] },
      },
      [{ label: "Floor Plan", amount: 125 }],
    ],
    [
      "reconciles partial pricing by applying the positive delta to the priced row",
      {
        total: 125.01,
        propertyDetails: { type: "Apartment", size: "1 Bed" },
        shootDetails: { services: ["Photography", "Unknown_Service"] },
      },
      [{ label: "Photography", amount: 125.01 }],
    ],
    [
      "uses a distinct adjustment row instead of making a service amount negative",
      {
        total: 50,
        propertyDetails: { type: "Apartment", size: "1 Bed" },
        shootDetails: { services: ["Photography", "360° Tour"] },
      },
      [
        { label: "Photography", amount: 100 },
        { label: "360° Tour", amount: 75.25 },
        { label: "Booking total adjustment", amount: -125.25 },
      ],
    ],
  ])("%s", (_name, booking, expected) => {
    const items = buildBookingInvoiceItems(booking, pricingConfig);

    expect(items).toEqual(expected);
    expect(items.reduce((sum, item) => sum + item.amount, 0)).toBe(
      booking.total,
    );
  });

  it.each([
    [
      "no services",
      {
        total: 99.99,
        propertyDetails: { type: "Apartment", size: "1 Bed" },
        shootDetails: { services: [] },
      },
      "Booking",
    ],
    [
      "zero and malformed prices",
      {
        total: 99.99,
        propertyDetails: { type: "Apartment", size: "1 Bed" },
        shootDetails: { services: ["Zero_Price", "Malformed_Price"] },
      },
      "Zero Price, Malformed Price",
    ],
  ])("falls back safely for %s", (_name, booking, label) => {
    expect(buildBookingInvoiceItems(booking, pricingConfig)).toEqual([
      { label, amount: booking.total },
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

  it.each([
    [
      "the associated coupon when immutable metadata is absent",
      { couponDeduction: 25, coupon: { code: "welcome25" } },
      { label: "Coupon (WELCOME25)", amount: 25 },
    ],
    [
      "a generic label when no code was persisted",
      { couponDeduction: 25 },
      { label: "Coupon Discount", amount: 25 },
    ],
    ["zero", { couponDeduction: 0 }, null],
    ["negative", { couponDeduction: -10 }, null],
    ["malformed", { couponDeduction: "not-a-number" }, null],
  ])("handles %s coupon deductions", (_name, transaction, expected) => {
    expect(buildInvoiceCouponSummary(transaction)).toEqual(expected);
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

  it.each([
    [
      "a generic legacy bulk discount",
      { bulkDeduction: 99.995 },
      [{ label: "Discount", amount: 100 }],
    ],
    [
      "a promotion snapshot without legacy deductions",
      {
        promotionSnapshot: {
          id: 5,
          kind: "GENERIC",
          code: "save15",
          benefitAmount: 15,
        },
      },
      [{ label: "Promo Code (SAVE15)", amount: 15 }],
    ],
    [
      "one launch-credit row when a snapshot overlaps its legacy representation",
      {
        promotionSnapshot: {
          id: 6,
          kind: "AUTOMATIC",
          name: "First-Shoot Launch Credit",
          benefitAmount: 500,
        },
        bulkDeduction: 500,
        metadata: { appliedLaunchPromoDeduction: 500 },
      },
      [{ label: "Promotion (First-Shoot Launch Credit)", amount: 500 }],
    ],
    [
      "one generic-code row when a snapshot overlaps its legacy coupon",
      {
        promotionSnapshot: {
          id: 7,
          kind: "GENERIC",
          code: "save20",
          benefitAmount: 20,
        },
        couponDeduction: 20,
        metadata: { appliedCouponCode: "SAVE20" },
      },
      [{ label: "Promo Code (SAVE20)", amount: 20 }],
    ],
    [
      "a historical launch-credit and coupon combination",
      {
        bulkDeduction: 500,
        couponDeduction: 25,
        metadata: {
          appliedLaunchPromoDeduction: 500,
          appliedCouponCode: "legacy25",
        },
      },
      [
        { label: "First-Shoot Launch Credit", amount: 500 },
        { label: "Coupon (LEGACY25)", amount: 25 },
      ],
    ],
    [
      "malformed and non-positive deductions",
      {
        bulkDeduction: "bad",
        couponDeduction: -5,
        promotionSnapshot: { benefitAmount: "NaN" },
      },
      [],
    ],
  ])("renders %s", (_name, transaction, expected) => {
    expect(buildInvoiceDiscountSummaries(transaction)).toEqual(expected);
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
