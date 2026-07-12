# Report month input does not update the displayed reports

- Route: `/admin/analytics` (Reports)
- Severity: High
- Status: `NOT_STARTED`
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
