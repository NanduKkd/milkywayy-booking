# Admin analytics and finance security test plan

- Last updated: 2026-07-02
- Release gate status: `IN_PROGRESS`

## Automated gates

- Role/permission tests cover Dashboard, Reports, drill-down, exports, and every
  expense mutation independently.
- Date ranges, grouping, sort keys, page sizes, metric keys, and export formats
  reject unsupported or unbounded values.
- Decimal calculations avoid floating-point loss and reconcile at currency precision.
- Pending/failed transactions are excluded; refunds cannot produce duplicate deductions.
- Expense create/update rejects negative, zero, excessive, malformed, or unsupported values.
- Soft-deleted expenses are excluded from reports but retained for authorized audit.
- Drill-down IDs cannot be used for cross-permission or IDOR access.
- CSV/Excel values beginning with formula characters are neutralized.
- PDF and spreadsheet generation escape user-controlled text and enforce output limits.
- Export responses contain no secrets, internal metadata, or fields outside the report contract.
- Representative finance analytics checks stay within the agreed synthetic response budget: Dashboard under `1500ms`, Financial Reports under `2500ms`, and drill-down under `1000ms` on the repo verification fixture while data-loading tests confirm bounded indexed query windows.

## Manual gates

- Reconcile at least one normal month, refund month, empty month, and boundary month.
- Verify Accounts permissions independently for view, export, and expense mutation.
- Verify browser cancellation/retry does not duplicate expenses or exports.
- Inspect generated CSV, Excel, and PDF files for correct filters, timezone, totals,
  encoding, and safe customer/property text.

The tracked release evidence lives in `ROLLOUT-VERIFICATION.md`. Exact sampled
totals and operator-specific signoff remain in the ignored local worksheet
`docs/private/ADMIN-ANALYTICS-FINANCE-ROLLOUT.md`.

## Release blockers

- Dashboard, Reports, drill-down, and export totals disagree for identical filters.
- Unauthorized financial or customer data is readable or exportable.
- Formula injection or unsafe document rendering is reproducible.
- Expense deletion is physically destructive or unaudited.
- Representative queries exceed agreed resource/latency limits without mitigation.
