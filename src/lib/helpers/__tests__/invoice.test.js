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

jest.mock("@/lib/db/models/booking", () => ({}));
jest.mock("@/lib/db/models/user", () => ({}));
jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

import puppeteer from "puppeteer";
import {
  buildBookingInvoiceItems,
  buildInvoiceCouponSummary,
  buildInvoiceDiscountSummaries,
  buildInvoiceHtml,
  generateAndUploadInvoice,
  INVOICE_TEMPLATE_VERSION,
  isTransactionInvoiceCurrent,
} from "@/lib/helpers/invoice";
import { getPricingConfig } from "@/lib/helpers/pricing";

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
