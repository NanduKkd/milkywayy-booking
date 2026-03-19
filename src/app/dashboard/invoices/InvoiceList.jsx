"use client";

import { Download } from "lucide-react";
import {
  buildInvoiceDownloadUrl,
  formatBookingReferenceList,
  formatInvoiceCardProperty,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";

export default function InvoiceList({ invoices }) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card/70 p-6 text-sm text-muted-foreground">
        No invoices found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => {
        const invoiceNumber = formatInvoiceNumber(invoice.id);
        const downloadUrl = buildInvoiceDownloadUrl(invoice.invoiceUrl, invoiceNumber);
        return (
          <div
            key={invoice.id}
            className="grid gap-5 rounded-[28px] border border-white/10 bg-card/70 px-6 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-8"
          >
            <div className="min-w-0">
              <div className="mb-2 text-lg font-semibold leading-tight text-white md:text-2xl">
                Invoice #{invoiceNumber}
              </div>
              <p className="truncate text-base text-foreground/80 md:text-base">
                {formatInvoiceCardProperty(invoice.bookings)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Booking ID: {formatBookingReferenceList(invoice.bookings) || "N/A"} •{" "}
                {new Date(invoice.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center justify-start md:justify-end">
              {invoice.invoiceUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <Download size={16} />
                  Download PDF
                </a>
              ) : (
                <span className="text-sm italic text-muted-foreground">
                  Generating invoice...
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
