# Portfolio load failure is presented as an empty library

- **Route:** `/admin/portfolio`
- **Severity:** High
- **Status:** `NOT_STARTED`
- **Owner:** Engineering
- **Project-owner intervention:** No

## Steps to reproduce

1. Sign in to the admin portal as a super administrator.
2. Open `/admin/portfolio` in the default desktop browser view (1280 × 720).
3. Wait for the portfolio table to finish loading.

## Expected

When the live portfolio request fails, the page should preserve that error state and avoid treating the library as empty. Portfolio totals and the table should show an unavailable/error state, with an actionable retry path where appropriate.

## Actual

The page displays `Unable to load every portfolio entry` and `fetch failed`, but also renders all three totals as `0` and shows `No portfolio items found` with a prompt to create the first entry. This makes a production-data load failure indistinguishable from a genuinely empty portfolio and risks an administrator adding duplicate replacement content.

## Evidence

- Reproduced on July 11, 2026 at `http://localhost:3000/admin/portfolio`.
- Browser viewport: 1280 × 720 pixels.
- The visible page error was `Unable to load every portfolio entry` followed by `fetch failed`.
- At the same time, the page reported `Total entries 0`, `Visible on site 0`, `Current filter 0`, and displayed the empty-library message.
- The page had no horizontal overflow (`clientWidth: 1265`, `scrollWidth: 1265`).
- Browser console contained no additional error or warning messages for this route.
