"use client";

import { Download, LoaderCircle } from "lucide-react";
import {
  buildInvoiceDownloadUrl,
  formatBookingReferenceList,
  formatInvoiceCardProperty,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";

function formatInvoiceDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatInvoiceAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  return `AED ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InvoiceList({ invoices }) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card/70 p-6 text-sm text-muted-foreground">
        No invoices found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-card/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <caption className="sr-only">Customer invoice table</caption>
          <thead className="bg-white/[0.015]">
            <tr className="border-b border-white/10">
              {[
                "Invoice ID",
                "Booking ref",
                "Property",
                "Date",
                "Amount",
                "Status",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-5 py-[18px] text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground first:pl-6 last:pr-6"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const invoiceNumber = formatInvoiceNumber(invoice);
              const bookingReferences = formatBookingReferenceList(
                invoice.bookings,
              );
              const downloadUrl = buildInvoiceDownloadUrl(
                invoice.invoiceUrl,
                invoiceNumber,
                invoice.id,
              );
              return (
                <tr
                  key={invoice.id}
                  className="border-b border-white/10 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-5 py-[18px] pl-6 text-sm font-semibold text-white">
                    Invoice #{invoiceNumber}
                  </td>
                  <td className="whitespace-nowrap px-5 py-[18px] text-sm text-foreground/70">
                    {bookingReferences || "N/A"}
                  </td>
                  <td className="max-w-[250px] px-5 py-[18px] text-sm text-foreground/70">
                    <span className="block truncate">
                      {formatInvoiceCardProperty(invoice.bookings)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-[18px] text-sm text-foreground/70">
                    {formatInvoiceDate(invoice.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-[18px] text-sm font-bold text-white">
                    {formatInvoiceAmount(invoice.amount)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-[18px]">
                    <span className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/[0.08] px-3 py-1.5 text-xs font-bold text-emerald-400">
                      Completed
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-[18px] pr-6">
                    {invoice.invoiceUrl ? (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                      >
                        <Download size={16} />
                        Download
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle
                          className="animate-spin"
                          size={16}
                          aria-hidden="true"
                        />
                        Generating invoice...
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-white/10 px-5 py-3 text-xs text-muted-foreground sm:hidden">
        Swipe to view all invoice details.
      </p>
    </div>
  );
}
