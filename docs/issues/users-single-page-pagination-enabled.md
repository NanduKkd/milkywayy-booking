# Pagination controls remain enabled on a single-page directory

- **Route:** `/admin/users`
- **Severity:** Low
- **Status:** `NOT_STARTED`
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
