"use client";

import { Download } from "lucide-react";
import {
  formatBookingReferenceList,
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
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-card/70 p-6 md:flex-row md:items-center"
        >
          <div>
            <div className="mb-2 text-xl font-semibold text-white">
              Invoice #{formatInvoiceNumber(invoice.id)}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{new Date(invoice.createdAt).toLocaleDateString()}</p>
              <p>
                Booking
                {invoice.bookings?.length > 1 ? "s" : ""}:{" "}
                {formatBookingReferenceList(invoice.bookings) || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-end flex-col gap-2">
            <span className="font-bold text-foreground">AED {invoice.amount}</span>
            {invoice.invoiceUrl ? (
              <a
                href={invoice.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Download size={16} />
                Download
              </a>
            ) : (
              <span className="text-sm italic text-muted-foreground">
                Generating invoice...
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
