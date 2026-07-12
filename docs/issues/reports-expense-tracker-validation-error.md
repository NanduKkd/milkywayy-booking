# Expense Tracker fails to load on Reports

- Route: `/admin/analytics` (Reports)
- Severity: High
- Status: `NOT_STARTED`
- Owner: Engineering
- Project-owner intervention: No

## Reproduction steps

1. Sign in to the admin portal as a super admin.
2. Open **Reports** (`/admin/analytics`) with any report month selected.
3. Scroll to the **Expense Tracker** section.
4. Select **Retry**. The same result also occurs after selecting the page-level **Refresh** control.

## Expected

The Expense Tracker should load the selected month's expense data, or show a clear no-expenses state when none exist. The **Add expense** control should be available when the tracker is operational and the user is authorized.

## Actual

The Expense Tracker is unavailable, **Add expense** is disabled, and the UI exposes the validation message: `includeDeleted must be true or false`. Retrying and refreshing do not recover the section.

## Evidence

- Browser audit at `http://localhost:3000/admin/analytics` on 2026-07-11, authenticated as `superadmin@milkywayy.com`.
- The Dashboard Analytics and Financial Reports sections loaded, while Expense Tracker consistently displayed **Expense tracker unavailable** followed by `includeDeleted must be true or false`.
- The failure persisted after the non-destructive **Retry** and page-level **Refresh** controls were used.
