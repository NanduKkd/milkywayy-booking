# Invoice identifier security and test plan

## Automated guarantees

`src/lib/helpers/__tests__/invoice-format.test.js` verifies UTC day boundaries,
sequence padding and growth, invalid input rejection, persisted and legacy
invoice display, booking-reference round trips, property/list fallbacks, and
download-path validation.

`src/lib/helpers/__tests__/numbering.test.js` verifies persisted-number reuse,
paid-time precedence, exact UTC query replacements, controlled-clock fallback,
invalid count rejection, ORM updates, direct allocation for a previously
unnumbered plain object without `update`, its constrained persistence query and
failure behavior before in-memory synchronization, and bounded unique-error
retry.

`src/lib/helpers/__tests__/invoiceNumbering.postgres.test.js` creates a
reserved, disposable PostgreSQL database through the shared harness. It runs
two synthetic successful transactions for the same UTC day concurrently,
asserts two distinct persisted numbers, and attempts a duplicate write against
the real `transactions.invoice_number` unique constraint. It also holds the
same transaction-scoped daily advisory lock from one real backend and verifies
through `pg_stat_activity` that the second allocator backend is actively
waiting on that lock before release; a bounded timeout fails rather than
hanging. After release, the second allocator persists the next distinct
number. A methodless-object case reloads the real row to prove durable number
persistence and verifies the real unique constraint rejects a duplicate. Its
combined regression passes an unnumbered methodless transaction through
`ensureTransactionInvoiceUrl`; a synthetic browser boundary returns a safe
test-only URL while the real row proves durable number, URL, and template
metadata persistence by ID. It never uses production credentials or customer
records.

Run focused unit coverage with:

```bash
npm run test:invoices:coverage
```

The focused Jest configuration covers only `invoice.js`, `invoice-format.js`,
and `numbering.js`, and fails closed below 85% statements or 75% branches over
that owned set. Its companion proof deliberately raises the statement threshold
to 101% and accepts only Jest's matching threshold diagnostic; an unrelated
test, syntax, or configuration failure is rejected rather than misreported as
proof:

```bash
npm run test:invoices:quality-gate-proof
```

Run the database proof only with the explicit test-admin environment described
in the promotion security plan, and only against a disposable PostgreSQL
server:

```bash
npm run test:invoices:postgres
npm run cleanup:disposable-postgres
```

The shared harness requires `NODE_ENV=test`, explicit opt-in, the `postgres`
maintenance database, and names every temporary database with its reserved
prefix. It closes registered connections and drops the database after both
successful setup/tests and setup failures; cleanup refuses any non-reserved
name. The pull-request workflow runs this command against PostgreSQL 16 and
runs cleanup in an `always()` step.

The pull-request workflow independently runs the focused unit coverage gate,
deliberate-failure proof, real PostgreSQL suite, and Chromium PDF smoke. Each
process has a bounded job and command timeout. The generated PDF remains
temporary and is never an Actions artifact.

## Release checks

- Do not weaken or remove the invoice-number unique constraint.
- Do not use a shared, production, or customer-data database for concurrency
  proof.
- Record the exact test command, pass count, PostgreSQL version, cleanup result,
  and concurrent result in the pull request.
- Treat an unresolved allocation error as a failed generation path; do not
  synthesize a duplicate or malformed invoice number.
- The combined plain-object URL-plus-number regression must continue to reload
  the real transaction row and prove number, URL, metadata, and in-memory state
  agree.
