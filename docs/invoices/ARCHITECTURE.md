# Invoice architecture

## Rendering boundary

`buildInvoiceHtml` in `src/lib/helpers/invoice.js` builds the complete invoice
HTML from explicit transaction, user, booking, pricing, asset, invoice-number,
and issue-time inputs. It is deterministic for a given input: invoice dates are
formatted in UTC with the `en-GB` locale, so host locale and timezone do not
change the customer-visible date.

The builder is responsible for invoice identity and date, booking reference
labels, bill-to fields, itemized services, discounts, totals, payment details,
and stable company/footer content. `generateAndUploadInvoice` resolves its
external inputs, calls this builder once, sends that returned HTML to Puppeteer,
and uploads the resulting PDF. Booking resolution and upload/retry behavior are
separate concerns from the HTML contract.

## Data and trust boundaries

Transaction fields, customer profile fields, booking labels/references, service
labels, promotion/coupon labels, and transaction identifiers are treated as
text. The renderer HTML-escapes them before interpolation. Billing addresses are
escaped first and then newlines are represented by controlled `<br/>` elements.
Public asset URLs are also escaped when placed in image attributes.

The template derives item rows through the existing pricing helpers and derives
promotion/coupon rows through the existing immutable transaction pricing
helpers. This preserves the accepted pricing and promotion policy rather than
reimplementing it in the presentation layer.
