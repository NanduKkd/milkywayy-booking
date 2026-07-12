# Pagination controls remain enabled on a single-page directory

- **Route:** `/admin/users`
- **Severity:** Low
- **Status:** `DONE`
- **Owner:** Engineering
- **Project-owner intervention:** No

## Steps to reproduce

1. Sign in as a super administrator and open `/admin/users`.
2. Use the default page size of 10 records.
3. With the directory showing only two records and the text `Page 1 of 1`, observe the pagination controls.
4. Select **Next** (or **Previous**).

## Expected

When there is only one page, **Previous** and **Next** should be disabled or otherwise clearly unavailable, since neither action can change the displayed results.

## Actual

Both controls are enabled. Selecting **Next** leaves the route at `/admin/users`, continues to show `Page 1 of 1`, and leaves both rows visible.

## Evidence

- Default desktop viewport: 1280 x 720.
- The page reported `Showing 1-2 of 2 accounts` and `Page 1 of 1`.
- Browser inspection reported both **Previous** and **Next** buttons with `disabled: false`.
- After selecting **Next**, the page still reported `Page 1 of 1`, displayed two rows, and remained at `http://localhost:3000/admin/users`.

## Resolution

Resolved on 2026-07-12 by giving the **Previous** and **Next** controls native
disabled state whenever the current directory has no earlier or later page. This
preserves the existing visual treatment while making the boundary state correct
for pointer, keyboard, and assistive-technology users.

## Verification

- Added a focused `UserTable` regression test that renders `Page 1 of 1`, asserts
  that both pagination buttons are disabled, and confirms clicks do not navigate.
- `jest src/components/__tests__/UserTable.test.jsx --runInBand` (9 tests passed)
- `biome check src/components/UserTable.js src/components/__tests__/UserTable.test.jsx`
  (2 files passed)
