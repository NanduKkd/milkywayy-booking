# Admin customer management security test plan

- Last updated: 2026-06-30
- Release gate status: `NOT_STARTED`

## Automated gates

- Customer list, search, totals, and pagination always enforce `CUSTOMER` role server-side.
- Staff accounts cannot appear through alternate sort/filter/query parameters.
- Permission tests distinguish customer view, edit, deactivate, and reactivate actions.
- Customer IDs cannot be used for unauthorized reads or mutations.
- Create/edit blocks role mass assignment and validates account type, email,
  phone, company, billing, and TRN fields.
- Deactivation invalidates/rejects OTP, active session, dashboard, booking, API,
  file, invoice, wallet, and OAuth access as defined by the lifecycle contract.
- Repeated deactivate/reactivate requests are idempotent and auditable.
- API responses and logs omit passwords, OTPs, tokens, and unnecessary billing PII.

## Manual gates

- Verify staff appear in Settings and not Users at any viewport or URL state.
- Verify an Accounts role without customer permission cannot access the page or API.
- Verify deactivation confirmation identifies the customer and requires a reason.
- Verify historical bookings, invoices, payments, wallet entries, and files remain intact.
- Verify reactivation does not silently recreate revoked external consent.

## Release blockers

- Any staff account appears in customer search, totals, or exports.
- A disabled customer retains an in-scope access path.
- Deactivation deletes or corrupts historical records.
- Unauthorized PII access or role mutation is possible.
