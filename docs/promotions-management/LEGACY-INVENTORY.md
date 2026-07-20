# Promotions legacy inventory and migration mapping

- Last updated: 2026-07-21

## Purpose

This document records the current coupon, launch-credit, discount, wallet, and
invoice behavior that promotions management must preserve, replace, or defer at
cutover.

## Legacy inventory

| Legacy surface | Current source | Observed behavior | Persistence / config | Promotions disposition |
|---|---|---|---|---|
| Generic coupons | `src/lib/db/models/coupon.js`, `src/lib/actions/coupons.js` | Admin-managed code rows store `code`, `perUser`, `minimumAmount`, `percentDiscount`, `maxDiscount`, optional `uiText`, and activation windows. Checkout validates one entered code, applies a percentage discount capped by `maxDiscount`, and stores `couponId` plus `couponDeduction` on the transaction. | `coupons` table plus `transactions.coupon_id` and `transactions.coupon_deduction` | `MIGRATE` to `GENERIC` promotions. Preserve activation semantics, minimum spend, capped percentage benefit, admin messaging, and transaction/invoice explainability. |
| System launch credit (`LAUNCH500`) | `src/lib/config/promo.js`, `src/lib/actions/coupons.js`, `src/lib/actions/bookings.js`, `src/app/booking/BookNew.js` | System-managed first-booking benefit auto-applies when active. It awards AED 250 for subtotals from AED 449 to AED 999.99 and AED 500 from AED 1000 upward. A persisted coupon row can only override UI text or deactivate it; customers cannot manually redeem the code. Eligibility uses successful paid booking count. The public booking UI nudges customers from AED 751 to AED 999 toward the AED 1000 tier. | Hard-coded promo constants with optional `coupons` row override and transaction metadata `appliedLaunchPromoDeduction` | `MIGRATE` to a system `AUTOMATIC` promotion with trigger config for first paid booking. Preserve tiers, auto-apply behavior, optional admin disable, and public messaging. Do not preserve manual code entry because the live action already rejects it. |
| Automatic direct discounts | `src/lib/actions/discounts.js`, `src/app/admin/discounts/DiscountManager.jsx`, `src/lib/actions/bookings.js` | Admin-configured discounts are stored as an ordered JSON array. Active `direct` rules apply when `totalAmount >= minAmount`. Each rule computes `min(currentAmount * percentage / 100, maxDiscount)` and reduces `currentAmount` before the next rule, so overlapping rules stack sequentially rather than compare on the same subtotal. | `dynamic_configs.value` for key `discounts` | `MIGRATE_WITH_RULE_CHANGE` to `AUTOMATIC` promotions. Preserve rule metadata, active state, and threshold/cap semantics, but replace sequential stacking with the accepted single-best-promotion selector from `PRM-D001` to `PRM-D003`. |
| Automatic wallet-credit rules | `src/lib/actions/discounts.js`, `src/app/admin/discounts/DiscountManager.jsx`, `src/lib/actions/bookings.js`, `src/lib/services/bookingWorkflow.js` | Admin-configured `wallet` rules use the same ordered JSON array. Matching rules accumulate wallet credits but do not reduce checkout totals. Checkout creates `wallet_transactions` rows in `pending` state, with the latest derived expiry date winning when multiple wallet rules contribute. Credits activate only after all bookings on the transaction reach `PROJECT_COMPLETED`. | `dynamic_configs.value` for key `discounts` plus `wallet_transactions` rows tied to `transaction_id` | `KEEP_SEPARATE` from promotion selection per `PRM-D004`. Preserve rule thresholds, expiries, and post-completion activation. Do not model wallet credit as a selected promotion or checkout deduction. |
| Transaction discount snapshot | `src/lib/db/models/transaction.js`, `src/lib/actions/bookings.js` | Transactions persist final payable `amount`, `couponId`, `couponDeduction`, `bulkDeduction`, and metadata containing `appliedDiscounts`, `appliedCouponCode`, `appliedLaunchPromoDeduction`, and `bookingIds`. `walletDeduction` exists on the model but is not written anywhere in the live booking flow. | `transactions` table | `MIGRATE` by adding promotion reference and calculation snapshot while keeping legacy columns readable during compatibility rollout. Treat `walletDeduction` as legacy-unused and do not repurpose it without an explicit migration step. |
| Invoice discount rendering | `src/lib/helpers/invoice.js` | Invoices render immutable `promotionSnapshot` benefits as promotion rows and retain legacy bulk and coupon explanation rows. A legacy bulk row is `First-Shoot Launch Credit` when `bulkDeduction` matches `appliedLaunchPromoDeduction`, otherwise `Discount`; coupon rows prefer `metadata.appliedCouponCode`, then the associated coupon code. Matching snapshot/legacy launch or coupon representations render once, while distinct historical rows remain separate. The accepted historical launch-credit-plus-coupon combination still renders both rows. | Derived from `promotion_snapshot`, legacy transaction deductions, associated coupon, and metadata | `MIGRATE` by preserving customer-visible explanations and suppressing only duplicate representations of the same persisted benefit; this does not re-enable stacking for new checkout selection. |
| Legacy admin navigation | `src/components/admin/AdminSidebarNav.js`, `src/app/admin/coupons/page.jsx`, `src/app/admin/discounts/page.jsx` | Coupons and Discounts are separate admin routes today. Coupons support create, activation toggle, and hard delete. Discounts support ordered create/edit/toggle/delete for `direct` and `wallet` rules. | Route structure and server actions | `MIGRATE` to one Promotions page with parity for create/edit/activate/deactivate. Hard delete of used/system promotions is intentionally replaced by deactivation per `PRM-D008`. |

## Explicit cutover differences

- Legacy stacking is real today and is covered by tests:
  - launch credit can stack with a generic coupon
  - multiple direct discounts can compound in saved order
- Promotions cutover intentionally removes that behavior in favor of one best
  promotion plus separate wallet credit, as accepted in `DECISIONS.md`.
- `src/lib/actions/__tests__/coupons.test.js` still expects `LAUNCH500` to be
  manually valid, but the live action rejects manual entry and auto-applies the
  launch credit instead. Keep that mismatch tracked under `PRM-304`.

## Invoice compatibility matrix

Invoice rows explain persisted benefits; they do not select or reapply them.
The accepted combinations are:

| Persisted representation | Invoice rows | Compatibility intent |
|---|---|---|
| Promotion snapshot only | One immutable promotion row | Current no-stacking checkout behavior. |
| Legacy bulk deduction | One `Discount` row, or `First-Shoot Launch Credit` when its stored launch metadata matches | Historical explainability. |
| Legacy coupon deduction | One uppercased coupon row using immutable metadata, associated coupon code, or a generic fallback label | Historical explainability. |
| Legacy launch credit plus legacy coupon | Both rows | Intentionally reproducible pre-cutover combination. |
| Promotion snapshot plus matching legacy launch or coupon representation | One snapshot row | The same persisted commercial benefit must not be shown twice. |

Snapshot and legacy fields that do not identify the same benefit remain
separate rows so invoices do not silently erase valid historical explanations.
New checkout selection still permits at most one promotion under PRM-D001; this
matrix does not re-enable stacking.

For legacy booking itemization, invoice videography selections use
`propertyDetails.videographySubService` first and fall back to
`shootDetails.videographySubService`. This matches the persisted booking
compatibility path and keeps the selected sub-service label and price intact.

## Verification notes

- Code review of the sources listed above completed on 2026-07-01.
- Focused repository checks on 2026-07-01:
  - `npx jest src/lib/actions/__tests__/bookings.test.js src/lib/helpers/__tests__/invoice.test.js src/lib/services/__tests__/bookingWorkflow.test.js src/lib/actions/__tests__/coupons.test.js --runInBand`
  - Result: `bookings.test.js`, `invoice.test.js`, and `bookingWorkflow.test.js` passed; `coupons.test.js` failed because it still expects `LAUNCH500` to be manually redeemable.
