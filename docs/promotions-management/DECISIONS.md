# Promotions management decisions

- Last updated: 2026-07-20

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
| PRM-D010 | Promotions, assignments, redemptions, and audit events are modeled as separate first-class tables. | Usage enforcement, customer targeting, mutation history, and staged migration become brittle if stored in one JSON blob or overloaded legacy rows. |
| PRM-D011 | Transactions store an immutable `promotion_snapshot` in addition to foreign keys. | Invoices, support review, and rollback comparisons must remain reproducible even if a promotion is later edited or deactivated. |
| PRM-D012 | Promotion mutation history is append-only with before/after state capture. | Admin pricing changes require operator accountability without rewriting historical audit evidence. |
| PRM-D013 | Personal-promotion customer search and direct assignment target only existing `CUSTOMER` users whose `disabledAt` value is null. Disabling an account does not remove or rewrite assignment history. | Applying the same eligibility predicate at discovery and mutation boundaries blocks UI bypasses, excludes staff and disabled accounts, preserves audit evidence, and returns the same not-found behavior for every ineligible identifier. |

## Deferred scope

- Multiple-promotion stacking.
- Arbitrary user-authored expressions.
- Referral and affiliate systems.
- Bulk single-use code campaigns.
