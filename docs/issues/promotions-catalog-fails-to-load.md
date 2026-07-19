# Promotions catalog fails to load

- **Route:** `/admin/promotions`
- **Severity:** High
- **Status:** `DONE` (resolved July 11, 2026)
- **Owner:** Engineering
- **Project-owner intervention:** No

## Steps to reproduce

1. Sign in to the admin portal as a super admin.
2. Open `/admin/promotions` in the default desktop browser view.
3. Wait for the page to finish loading.

## Expected

The page should load existing generic, personal, and automatic promotions along with their counts and customer assignments. If there are no records, it should show an accurate empty state without an error.

## Actual

The page displays **Unable to update promotions** with `PromotionAssignment is not associated to Promotion!`. All three promotion counts remain `0`, and each catalog shows an empty state, so administrators cannot view or manage the existing promotions from this route.

## Evidence

- Reproduced on July 11, 2026 at `http://localhost:3000/admin/promotions`.
- Visible error banner: `Unable to update promotions` / `PromotionAssignment is not associated to Promotion!`.
- Browser console recorded `SequelizeEagerLoadingError: PromotionAssignment is not associated to Promotion!` from `listPromotions`, called by `getPromotionsAdminDataHandler` while rendering `PromotionsPage`.
- The page rendered `0 / 0 / 0` promotion counts and empty Generic Codes and Personal Auto-Apply catalogs immediately after the error.

## Resolution evidence

- The promotions server-action entry point now initializes Sequelize associations before querying the assignment include.
- A fresh browser tab loaded the persisted `2 / 2 / 2` promotion counts and catalogs with zero console errors.
- All 9 promotion-related automated suites passed (66 tests), including admin CRUD, eligibility, pricing, checkout, redemptions, migration parity, and schema coverage.
