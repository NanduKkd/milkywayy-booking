/** @jest-environment node */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import puppeteer from "puppeteer";
import { buildInvoiceHtml } from "@/lib/helpers/invoice";

const execFileAsync = promisify(execFile);

jest.setTimeout(30000);

async function extractPdfText(pdfPath) {
  try {
    const { stdout } = await execFileAsync("pdftotext", [
      "-layout",
      pdfPath,
      "-",
    ]);
    return stdout;
  } catch (error) {
    throw new Error(
      "Invoice PDF smoke test requires Poppler pdftotext. Install poppler-utils (or Poppler on macOS) before running this test.",
      { cause: error },
    );
  }
}

function invoiceFixture() {
  return {
    transaction: {
      id: "txn_pdf_smoke_49",
      amount: 1400,
      paidAt: "2026-07-21T10:30:00.000Z",
      promotionSnapshot: {
        kind: "AUTOMATIC",
        name: "Synthetic Summer Discount",
        benefitAmount: 100,
      },
      metadata: { appliedCouponCode: "SMOKE25" },
    },
    user: {
      companyName: "Synthetic Studio LLC",
      billingAddress: "49 Test Avenue\nExample City",
      email: "invoice-smoke@example.test",
      phone: "+971 50 000 0049",
    },
    bookings: [
      {
        id: 49,
        bookingCode: "MWB-1049",
        total: 1500,
        propertyDetails: {
          type: "Apartment",
          size: "1 Bed",
          unit: "49A",
          building: "Synthetic Towers",
        },
        shootDetails: {
          services: ["Photography", "360° Tour"],
        },
      },
    ],
    pricingConfig: {
      Apartment: {
        sizes: [
          {
            label: "1 Bed",
            prices: { Photography: 900, "360° Tour": 600 },
          },
        ],
      },
    },
  };
}

async function cleanupInvoicePdfSmoke(
  browser,
  tempDir,
  removeDirectory = fs.rm,
) {
  try {
    await browser?.close();
  } finally {
    await removeDirectory(tempDir, { recursive: true, force: true });
  }
}

describe("invoice PDF smoke", () => {
  it("removes the temporary directory when Chromium shutdown rejects", async () => {
    const removeDirectory = jest.fn().mockResolvedValue(undefined);
    const browser = {
      close: jest.fn().mockRejectedValue(new Error("close failed")),
    };

    await expect(
      cleanupInvoicePdfSmoke(
        browser,
        "/tmp/synthetic-invoice",
        removeDirectory,
      ),
    ).rejects.toThrow("close failed");
    expect(removeDirectory).toHaveBeenCalledWith("/tmp/synthetic-invoice", {
      recursive: true,
      force: true,
    });
  });

  it("renders synthetic customer-visible invoice fields through local Chromium", async () => {
    const startedAt = performance.now();
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "milkywayy-invoice-pdf-"),
    );
    const pdfPath = path.join(tempDir, "synthetic-invoice.pdf");
    let browser;

    try {
      const executablePath = puppeteer.executablePath();
      try {
        await fs.access(executablePath);
      } catch (error) {
        throw new Error(
          `Puppeteer/Chromium invoice PDF smoke prerequisite is unavailable at ${executablePath}. Run 'npx puppeteer browsers install chrome' before running this test.`,
          { cause: error },
        );
      }

      const fixture = invoiceFixture();
      const html = buildInvoiceHtml({
        ...fixture,
        assets: {
          logoSrc:
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          signatureSrc:
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        },
        invoiceNumber: "MW-2026-0721-049",
        issuedAt: "2026-07-21T10:30:00.000Z",
      });

      try {
        browser = await puppeteer.launch({
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      } catch (error) {
        throw new Error(
          "Puppeteer/Chromium invoice PDF smoke prerequisite could not launch. Run 'npx puppeteer browsers install chrome' and retry; this test is intentionally not skipped.",
          { cause: error },
        );
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdfBuffer = Buffer.from(
        await page.pdf({ format: "A4", printBackground: true }),
      );
      await fs.writeFile(pdfPath, pdfBuffer);

      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      await expect(execFileAsync("pdfinfo", [pdfPath])).resolves.toMatchObject({
        stdout: expect.stringContaining("Pages:"),
      });

      const extracted = await extractPdfText(pdfPath);
      const normalizedText = extracted.replace(/\s+/g, " ").trim();
      expect(normalizedText).toContain("MW-2026-0721-049");
      expect(normalizedText).toContain("21/07/2026");
      expect(normalizedText).toContain("MWB-1049");
      expect(normalizedText).toContain("Synthetic Studio LLC");
      expect(normalizedText).toContain("Photography");
      expect(normalizedText).toContain("360° Virtual Tour");
      expect(normalizedText).toMatch(/Sub-Total AED 1500/);
      expect(normalizedText).toMatch(
        /Promotion \(Synthetic .*Summer Discount\) 100\.00/,
      );
      expect(normalizedText).toMatch(/Total AED 1400\.00/);
      expect(normalizedText).toContain("Payment Method:");
      expect(normalizedText).toContain("Stripe");
      expect(normalizedText).toContain("txn_pdf_smoke_49");

      console.info(
        `[invoice-pdf-smoke] bytes=${pdfBuffer.length} duration_ms=${Math.round(performance.now() - startedAt)} extracted_assertions=identity,booking,service,subtotal,discount,total,transaction`,
      );
    } finally {
      await cleanupInvoicePdfSmoke(browser, tempDir);
    }
  });
});
