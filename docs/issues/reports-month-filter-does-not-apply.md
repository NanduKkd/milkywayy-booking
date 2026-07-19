# Report month input does not update the displayed reports

- Route: `/admin/analytics` (Reports)
- Severity: High
- Status: `DONE`
- Owner: Engineering
- Project-owner intervention: No

## Reproduction steps

1. Sign in to the admin portal as a super admin and open **Reports**.
2. In **Report month**, replace `2026-07` with `2026-03`.
3. Move focus away from the field.
4. Review the selected month field, report heading, date-range badges, and export links.

## Expected

Changing the report month should refresh all report panels, date-range badges, and export URLs for the selected month.

## Actual

The field displays `2026-03`, but the report title, Expense Tracker description, and active reporting range still state July 2026. The data and exports therefore remain scoped to July while the visible filter indicates March.

## Evidence

- Browser audit at `http://localhost:3000/admin/analytics` on 2026-07-11, authenticated as `superadmin@milkywayy.com`.
- After setting the native month input to `2026-03` and moving focus away, the input value was `2026-03`, while the page heading still said reports were for July 2026 and the Expense Tracker still said `Logged expenses for July 2026`.
- No test records were created or modified during verification.

## Resolution

The month filter was already wired to the shared report state and range-derived
Dashboard, Financial Reports, Expense Tracker, and export surfaces. A newer
empty-default-month recovery path could still override an explicitly selected
empty month with the latest month containing activity. The month change handler
now marks the selection as explicit before updating state, so automatic recovery
is limited to the initial default-month lookup.

## Verification

- Added regression coverage in
  `src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx` that changes
  the report month from July 2026 to March 2026 and verifies the controlled
  input, both displayed date ranges, Expense Tracker month label, Dashboard,
  Financial Reports, and expense request ranges, plus CSV, Excel, and PDF export
  URLs.
- Verified on 2026-07-12 with the repository-pinned Jest binary running
  `--runTestsByPath src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx --runInBand`
  (7 tests passed).
- Verified the touched component and test with the repository-pinned Biome
  binary (2 files checked, no issues).
