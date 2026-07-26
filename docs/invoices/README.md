# Invoices

Customer invoices are rendered from the transaction, customer, resolved
bookings, pricing configuration, and public brand assets. The renderer lives in
[`src/lib/helpers/invoice.js`](../../src/lib/helpers/invoice.js).

The authenticated customer dashboard presents successful transactions in a
responsive table with invoice number, booking/property, date, AED amount,
completed status, and Download or Generating state. This presentation does not
change invoice numbering, booking resolution, generation, or storage behavior.

`buildInvoiceHtml` is the pure customer-visible content boundary. It receives
only explicit inputs and returns the exact HTML later supplied to Puppeteer.
`generateAndUploadInvoice` owns asset loading, booking resolution, pricing
lookup, PDF generation, and storage upload; it must not maintain a second
template path.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the rendering flow and
[SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md) for the content guarantees and
reproducible checks.

The real Chromium PDF smoke test is intentionally separate from storage: it
renders only synthetic fixtures to a disposable local directory, extracts the
customer-visible text, and removes the PDF in a `finally` path.
