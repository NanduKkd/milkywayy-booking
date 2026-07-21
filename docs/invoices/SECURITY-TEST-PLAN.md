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
