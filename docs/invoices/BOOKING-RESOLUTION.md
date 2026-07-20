# Invoice booking resolution and freshness

`src/lib/helpers/invoice.js` produces invoice URLs only from bookings that can
be resolved to the successful transaction. It first reads direct transaction
associations in ascending ID order. If none exist, it may recover the explicit
transaction metadata booking IDs for the same user. The final recovery path is
bounded to the transaction user, eligible booking statuses, a two-hour-before
to fifteen-minutes-after creation window, and a unique positive amount subset.

Recovery writes set the expected transaction ID and `CONFIRMED` status only for
the selected booking IDs and transaction user. They also accept only unlinked
bookings or bookings already linked to that transaction. An ambiguous subset,
missing match, invalid timestamp, missing user, or non-positive transaction
gross amount does not write a booking association.

`ensureTransactionInvoiceUrl` reuses an invoice only when its URL contains the
current invoice number and its metadata records the current template version
and resolved booking count. Otherwise it regenerates the PDF at the Puppeteer
and S3 boundaries, then records the URL plus freshness metadata without
discarding unrelated transaction metadata. Rendering or upload failure keeps a
previous URL (if any) and never marks a failed artifact current. The helper
also supports both Sequelize instances and plain-object transaction fallbacks.

## Verification

The hermetic focused gate is:

```sh
npx jest src/lib/helpers/__tests__/invoice.test.js --runInBand --coverage --collectCoverageFrom=src/lib/helpers/invoice.js
```

The test doubles exercise only synthetic bookings/users and mock AWS S3 and
Puppeteer before the external boundary. They assert ownership-constrained
recovery writes, no writes for ambiguity/failure cases, stale regeneration,
and prior-URL preservation. Do not substitute live storage, browser, or
database credentials for this gate.
