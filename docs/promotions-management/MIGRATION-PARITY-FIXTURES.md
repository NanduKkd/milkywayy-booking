# Promotions migration parity fixtures

- Last updated: 2026-07-01

## Purpose

These fixtures record representative pre-migration promotion outcomes and the
expected cutover behavior after the promotions-management migration.

They cover:

- preserved generic-coupon behavior
- preserved launch-credit tier behavior
- preserved wallet-credit separation
- intentional replacement of legacy direct-discount stacking with one
  deterministic best promotion

Automated verification lives in
`src/lib/services/__tests__/promotionMigrationParity.test.js`.

## Fixture matrix

| ID | Legacy source | Representative input | Legacy outcome | Migrated representation | Expected cutover outcome | Disposition |
|---|---|---|---|---|---|---|
| `PAR-001` | Generic coupon | Subtotal AED 900, code `SAVE20` | 20% off capped at AED 180 | One active `GENERIC` promotion with the same minimum spend, percent, cap, and code | Selected promotion is `SAVE20` for AED 180 | `PRESERVED` |
| `PAR-002` | Launch credit tier 1 | First paid booking, subtotal AED 700 | AED 250 launch credit | Two `AUTOMATIC` first-paid-booking promotions represent the AED 250 and AED 500 launch tiers | Selected promotion is `First-Shoot Launch Credit` for AED 250 | `PRESERVED` |
| `PAR-003` | Launch credit tier 2 | First paid booking, subtotal AED 1050 | AED 500 launch credit | The same two first-paid-booking launch promotions | Selected promotion is `First-Shoot Launch Credit` for AED 500 | `PRESERVED` |
| `PAR-004` | Launch credit exhausted | Second paid booking, subtotal AED 700 | No launch credit | The same two first-paid-booking launch promotions | No selected promotion | `PRESERVED` |
| `PAR-005` | Launch credit plus wallet rewards | First paid booking, subtotal AED 1200, two active wallet rules | AED 500 launch credit plus AED 160 wallet credit with the later wallet expiry winning | Two launch promotions plus unchanged wallet-rule evaluation | Selected promotion is AED 500 and wallet credit preview remains AED 160 with the latest expiry | `PRESERVED` |
| `PAR-006` | Ordered direct discounts | Subtotal AED 1000, two active direct rules at 10% capped AED 100 and 20% capped AED 150 | Sequential legacy stacking yields AED 250 total discount | Two `AUTOMATIC` promotions created from the direct rules | One best promotion applies for AED 150 | `INTENTIONAL_CHANGE` |

## Excluded fixture

- `PRM-304` remains separate. The historical `LAUNCH500` manual-redemption test
  mismatch is not treated as a parity fixture because the live action already
  rejects manual redemption and the tracker keeps that cleanup isolated.
