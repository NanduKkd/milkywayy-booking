"use client";

import { Download } from "lucide-react";

export default function InvoiceList({ invoices }) {
  if (!invoices || invoices.length === 0) {
    return <p className="text-gray-400">No invoices found.</p>;
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-gray-900 p-6 rounded-lg border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <div className="text-xl font-semibold mb-2 text-white">
              Invoice #{invoice.id}
            </div>
            <div className="text-gray-400 space-y-1 text-sm">
              <p>
                <span className="font-medium text-gray-300">Date:</span>{" "}
                {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium text-gray-300">Amount:</span> AED{" "}
                {invoice.amount}
              </p>
              <p>
                <span className="font-medium text-gray-300">Status:</span>{" "}
                <span className="text-green-500 capitalize">
                  {invoice.status}
                </span>
              </p>
            </div>
          </div>

          <div>
            {invoice.invoiceUrl ? (
              <a
                href={invoice.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <Download size={16} />
                Download PDF
              </a>
            ) : (
              <span className="text-gray-500 text-sm italic">
                Generating invoice...
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
