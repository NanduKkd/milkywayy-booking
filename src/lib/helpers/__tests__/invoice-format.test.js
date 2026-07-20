import {
  buildBookingReferenceFromId,
  buildInvoiceDownloadUrl,
  buildInvoiceNumber,
  formatBookingReference,
  formatBookingReferenceList,
  formatInvoiceCardProperty,
  formatInvoiceNumber,
  parseBookingReferenceToId,
} from "@/lib/helpers/invoice-format";

describe("buildInvoiceNumber", () => {
  it("uses the UTC calendar day at year and date boundaries", () => {
    expect(buildInvoiceNumber("2025-12-31T23:59:59.999Z", 1)).toBe(
      "MW-2025-1231-001",
    );
    expect(buildInvoiceNumber("2026-01-01T00:00:00.000Z", 12)).toBe(
      "MW-2026-0101-012",
    );
  });

  it("pads normal sequences, allows sequence growth, and rejects invalid input", () => {
    expect(buildInvoiceNumber("2026-07-21T12:00:00.000Z", 7)).toBe(
      "MW-2026-0721-007",
    );
    expect(buildInvoiceNumber("2026-07-21T12:00:00.000Z", 1000)).toBe(
      "MW-2026-0721-1000",
    );
    expect(buildInvoiceNumber("not-a-date", 1)).toBe("");
    expect(buildInvoiceNumber("2026-07-21", 0)).toBe("");
    expect(buildInvoiceNumber("2026-07-21", 1.5)).toBe("");
  });
});

describe("invoice and booking display identifiers", () => {
  it("preserves persisted invoices and falls back to the legacy invoice display", () => {
    expect(
      formatInvoiceNumber({ invoiceNumber: "MW-2026-0721-001", id: 4 }),
    ).toBe("MW-2026-0721-001");
    expect(formatInvoiceNumber("MW-2026-0721-001")).toBe("MW-2026-0721-001");
    expect(formatInvoiceNumber({ id: 42 })).toBe("INV-000042");
    expect(formatInvoiceNumber(null)).toBe("");
  });

  it("round-trips valid booking identifiers and rejects malformed values", () => {
    expect(buildBookingReferenceFromId(1)).toBe("MWB-1001");
    expect(buildBookingReferenceFromId(300)).toBe("MWB-1300");
    expect(parseBookingReferenceToId("MWB-1300")).toBe(300);
    expect(parseBookingReferenceToId(" MWB-1001 ")).toBe(1);
    expect(parseBookingReferenceToId("MWB-1000")).toBeNull();
    expect(parseBookingReferenceToId("MWY-001001")).toBeNull();
    expect(parseBookingReferenceToId("MWB-1001x")).toBeNull();
    expect(buildBookingReferenceFromId(0)).toBe("");
  });

  it("formats booking lists and property summaries with safe fallbacks", () => {
    expect(
      formatBookingReferenceList([{ bookingCode: "MWB-9010" }, { id: 11 }, {}]),
    ).toBe("MWB-9010, MWB-1011");
    expect(formatBookingReference({ id: 12 })).toBe("MWB-1012");
    expect(
      formatInvoiceCardProperty([
        {
          propertyDetails: {
            propertySize: "4BR",
            propertyType: "Villa",
            community: "Dubai Hills",
          },
        },
      ]),
    ).toBe("4BR Villa - Dubai Hills");
    expect(formatInvoiceCardProperty([])).toBe("Property booking");
  });
});

describe("buildInvoiceDownloadUrl", () => {
  it("only builds customer download paths for a valid persisted transaction", () => {
    expect(
      buildInvoiceDownloadUrl("https://example.test/invoice.pdf", "MW-x", 18),
    ).toBe("/api/invoices/download?transactionId=18");
    expect(
      buildInvoiceDownloadUrl("https://example.test/invoice.pdf", "MW-x", 0),
    ).toBeNull();
    expect(buildInvoiceDownloadUrl("", "MW-x", 18)).toBeNull();
    expect(
      buildInvoiceDownloadUrl(
        "https://example.test/invoice.pdf",
        "MW-x",
        "bad",
      ),
    ).toBeNull();
  });
});
