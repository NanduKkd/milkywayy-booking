# Admin analytics and finance decisions

- Last updated: 2026-06-30

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| FIN-D001 | Revenue is net successful payments by payment date, less refunds. | Payment records are the financial source of truth; completed bookings are operational state. |
| FIN-D002 | Dashboard and Reports share one aggregation service. | Identical filters must produce identical figures everywhere. |
| FIN-D003 | Expense v1 is limited to date, category, description, and amount plus audit metadata. | Receipts, vendors, VAT, recurring expenses, approvals, and accounting integrations are deferred. |
| FIN-D004 | Expense deletion is soft deletion. | Financial history requires traceability and recovery. |
| FIN-D005 | Profit is net revenue minus persisted expenses. | The formula remains explicit and reproducible. |
| FIN-D006 | Unattributable service revenue is labelled `Unallocated`. | Guessing would make service analytics misleading. |
| FIN-D007 | Exports are generated server-side from the same filtered dataset as Reports. | This prevents browser tampering and reconciliation drift. |
| FIN-D008 | Dubai business time defines reporting periods. | Month/day boundaries must match the operating business rather than server timezone. |
| FIN-D009 | Prototype figures and comparison claims are never shipped as defaults. | Every figure must derive from live records and expose a truthful empty state. |

## Open accounting detail

- FIN-002 must lock whether refunds are attributed to original payment month or
  refund occurrence month. The recommended implementation is refund occurrence
  month for cash reporting, with the original transaction retained in drill-down.

## Deferred scope

- Multi-currency conversion.
- Accrual accounting and tax/VAT reports.
- External bookkeeping integrations.
- Expense receipt storage and approval workflows.
