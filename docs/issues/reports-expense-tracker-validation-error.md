# Expense Tracker fails to load on Reports

- Route: `/admin/analytics` (Reports)
- Severity: High
- Status: `DONE`
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

## Resolution

The expense collection API always supplied an `includeDeleted` filter property,
even when the query parameter was absent. Its value was `undefined`, but the
expense service treats the presence of that property as a request to validate a
boolean and therefore returned `includeDeleted must be true or false`.

The API now constructs filters only from query parameters that are actually
present. An omitted `includeDeleted` parameter therefore reaches the service as
omitted and uses the service default of `false`; explicit values such as
`includeDeleted=false` remain available for validation.

## Verification

- Added API regression coverage for a month-scoped request without
  `includeDeleted` and for an explicit `includeDeleted=false` request.
- Verified on 2026-07-12 with
  `npx jest --runTestsByPath src/app/api/admin/expenses/__tests__/route.test.js src/lib/services/__tests__/expenseAdmin.test.js src/app/admin/analytics/__tests__/FinancialReportsPage.test.jsx --runInBand`.
- Result: 3 test suites passed, 19 tests passed.
