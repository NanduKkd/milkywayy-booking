# Invoice security and content test plan

## Automated content gate

`src/lib/helpers/__tests__/invoice.test.js` exercises the pure HTML boundary
with synthetic data only. It verifies a multi-booking invoice contains identity,
UTC date, singular/plural booking labels and references, company and individual
bill-to variants, itemized services, subtotal, promotion/coupon deductions,
tax, total, payment method, transaction ID, and stable company/footer details.

The suite also proves that generated HTML escapes names, addresses, email,
phone, TRN, booking/service/promotion labels, invoice numbers, coupon codes,
and transaction IDs. A multiline synthetic address retains its line break only
through controlled `<br/>` markup. The Puppeteer boundary test asserts that the
same pure builder output is the HTML passed to `page.setContent`.

Run the focused gate and its coverage locally with:

```sh
npx jest src/lib/helpers/__tests__/invoice.test.js --runInBand --coverage --collectCoverageFrom=src/lib/helpers/invoice.js
```

The test uses mocked browser and storage boundaries. It does not launch a real
browser, upload a PDF, access the database, or retain generated customer-like
artifacts. PDF conversion, storage integration, booking recovery, and invoice
numbering have their own bounded assurance work.

## Real local PDF smoke gate

`src/lib/helpers/__tests__/invoicePdf.smoke.test.js` launches the local
Puppeteer Chromium runtime and renders `buildInvoiceHtml` with fixed synthetic
customer, booking, pricing, discount, and transaction fixtures. It writes one
PDF under an operating-system temporary directory, verifies the PDF signature
and Poppler metadata, extracts text with `pdftotext`, and asserts invoice
identity/date, booking reference, service labels, subtotal, discount, total,
payment method, and transaction ID. Browser and temporary-directory cleanup
are in a `finally` path; no PDF is uploaded or retained as a CI artifact.

Run it with:

```sh
npm run test:invoices:pdf
```

The test is not skippable. A missing Puppeteer Chromium executable or launch
fails with the `npx puppeteer browsers install chrome` setup command. Poppler's
`pdfinfo` and `pdftotext` are also required; install `poppler-utils` on Linux
or Poppler on macOS. The pull-request workflow installs `poppler-utils`, runs
the smoke test with a five-minute process timeout, and logs the Puppeteer and
Chromium runtime information without uploading the generated PDF.
