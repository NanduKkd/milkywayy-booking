# Invoice identifier architecture

## Customer-visible identifiers

Successful transactions receive `MW-YYYY-MMDD-NNN` invoice numbers. The date
portion is always calculated from the effective timestamp in UTC; `paidAt`
takes precedence over `createdAt`. Sequences are padded to at least three
digits and continue to grow without truncation. Existing invoice numbers are
immutable and reused as-is. Historical records without one retain the display
fallback `INV-<transaction id padded to six digits>`.

Booking references use `MWB-<booking id + 1000>`. Parsing accepts only that
format and rejects an invalid or non-positive recovered identifier.

## Allocation and persistence

`ensureTransactionInvoiceNumber` returns immediately for a persisted number.
For an unnumbered transaction it opens a database transaction, acquires a
transaction-scoped PostgreSQL advisory lock derived from the UTC invoice day,
counts eligible successful transactions in the exact UTC interval, then writes
the formatted number. This serializes allocation within one day without
blocking another day.

`transactions.invoice_number` remains unique in PostgreSQL and is the final
integrity boundary. If another writer still wins a collision, allocation rolls
back and retries a bounded number of times with a valid next sequence; an
unresolved database error is surfaced rather than silently persisting an
ambiguous identifier. The model instance and plain-object representations are
updated only after the persistence transaction succeeds.

No migration or historical renumbering is part of this behavior: the existing
unique column is preserved.
