# Time-slots dialog offers “Unblock Day” for an unblocked date

- **Route:** `/admin/timeslots`
- **Severity:** Low
- **Status:** `NOT_STARTED`
- **Owner:** Engineering
- **Project-owner intervention:** No

## Steps to reproduce

1. Sign in to the admin portal as a super admin.
2. Open `/admin/timeslots` in the default desktop browser view (1280 × 720).
3. In the July 2026 calendar, select Saturday, July 11, 2026.

## Expected

When a selected date has no full-day or period-level manual blocks, the dialog should show only actions that apply to its current state. The **Unblock Day** action should be hidden or disabled.

## Actual

The dialog identifies all three periods as **Available** and the summary reports zero dates with manual blocks or closures, but it still displays an enabled **Unblock Day** button alongside the block actions. This presents an irrelevant potentially state-changing action and makes the current day state less clear.

## Evidence

- Reproduced on July 11, 2026 at `http://localhost:3000/admin/timeslots`.
- The selected-day dialog was titled **Saturday, July 11, 2026**.
- It showed **Morning**, **Afternoon**, and **Evening** as **Available**, each with a **Block** action.
- The page summary stated: `0 dates currently carry manual blocks or closures.`
- The same dialog exposed an enabled **Unblock Day** button. No state-changing action was selected during this audit.
