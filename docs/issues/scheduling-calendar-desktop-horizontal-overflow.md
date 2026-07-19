# Scheduling calendar overflows horizontally on desktop

- **Route:** `/admin/scheduling-calendar`
- **Severity:** Medium
- **Status:** `DONE`
- **Owner:** Engineering
- **Project-owner intervention:** No

## Steps to reproduce

1. Sign in to the admin portal as a super admin.
2. Open `/admin/scheduling-calendar` in the default desktop browser view (1280 × 720).
3. Select a date in the current month, for example Tuesday, July 14, 2026.
4. Scroll down to the lower portion of the page, including **Upcoming schedule**.

## Expected

All scheduling-calendar content should fit within the desktop viewport without a page-level horizontal scrollbar. The selected-day details and the **Upcoming schedule** card should be fully visible and use the available width coherently.

## Actual

The page has a large empty area between the left-side content and **Upcoming schedule**, while that card extends beyond the right side of the viewport. A horizontal scrollbar appears at the bottom of the page, and the table/card's right-side content is clipped until the user scrolls horizontally.

## Evidence

- Reproduced on July 11, 2026 at `http://localhost:3000/admin/scheduling-calendar`.
- Browser viewport: 1280 × 720 pixels.
- Document client width: 1265 pixels; document scroll width: 1442 pixels (`horizontalScrollbar: true`).
- The in-app browser screenshot showed the **Upcoming schedule** card cut off at the right edge and a visible bottom horizontal scrollbar.

## Resolution

The issue was already fixed by the current scheduling-calendar layout changes. The selected-day availability controls now use shrinkable, wrapping layouts (`min-w-0`, responsive auto-fit columns, and wrapping action rows), preventing their intrinsic width from expanding the two-column desktop grid. The **Upcoming schedule** table remains contained by its existing inner horizontal scroller.

## Verification

- `npx jest --runInBand src/app/admin/scheduling-calendar/__tests__/SchedulingCalendarPage.test.jsx`
- `npx biome check src/app/admin/scheduling-calendar/SchedulingCalendarPage.jsx src/app/admin/scheduling-calendar/__tests__/SchedulingCalendarPage.test.jsx`
- Safe browser check at 1280 × 720: document client width 1265 pixels; document scroll width 1265 pixels (`horizontalScrollbar: false`). The **Upcoming schedule** panel occupied x=352 through x=1233 and remained fully inside the viewport.
- Focused calendar UI suite: 9 tests passed, including the selected-day availability controls and bounded upcoming-schedule behavior.
