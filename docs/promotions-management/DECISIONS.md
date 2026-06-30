# Promotions management decisions

- Last updated: 2026-06-30

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| PRM-D001 | At most one promotion applies to a booking. | Silent stacking makes totals unpredictable and creates payment abuse risk. |
| PRM-D002 | Personal promotions replace automatic promotions. | Assigned partner/VIP terms are intentional customer-specific policy. |
| PRM-D003 | An entered generic code replaces the selected benefit only when strictly better. | Customers receive the better valid outcome without stacking or losing a personal benefit on ties. |
| PRM-D004 | Wallet credit remains separate from promotion selection. | Wallet is stored customer value and must not disappear during coupon consolidation. |
| PRM-D005 | Existing coupon, system launch-credit, direct-discount, wallet-credit, ordering, and activation behavior requires migration disposition before cutover. | The new UI must not erase existing commercial behavior. |
| PRM-D006 | Eligibility and benefit calculation live in a pure shared service. | Admin previews, booking pricing, checkout, tests, and invoices must agree. |
| PRM-D007 | Usage limits use durable redemption reservations. | Counting completed rows without reservation is unsafe under concurrent checkout. |
| PRM-D008 | Used or system promotions are deactivated, not physically deleted. | Historical transaction and invoice explanations must remain reproducible. |
| PRM-D009 | Dubai business dates control date-range rules. | Promotion eligibility must match the operating market's day boundaries. |

## Deferred scope

- Multiple-promotion stacking.
- Arbitrary user-authored expressions.
- Referral and affiliate systems.
- Bulk single-use code campaigns.
