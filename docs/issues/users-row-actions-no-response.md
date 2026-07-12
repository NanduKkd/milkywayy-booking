# User row actions do not provide account lifecycle controls

- **Route:** `/admin/users`
- **Severity:** Medium
- **Status:** `DONE` (resolved July 12, 2026)
- **Owner:** Engineering
- **Project-owner intervention:** No — product decision recorded July 12, 2026

## Steps to reproduce

1. Sign in as a super administrator and open `/admin/users`.
2. Observe the **Edit** and **Delete** controls.
3. Select each control. Do not take any further state-changing action.

## Expected

- **Edit** should not be offered on the Users page.
- An enabled customer account should offer **Disable**, not **Delete**. Disabling must require explicit confirmation and prevent that customer from logging in again.
- A disabled customer account should visibly show its state and offer **Enable** so an authorized administrator can restore login access.
- Non-customer accounts should expose none of these lifecycle controls.
- Disabling must preserve the user and their historical records; it is not deletion.

## Actual

Both controls accept focus but show no visible response. **Edit** does not open an editing dialog or route, and **Delete** does not display a confirmation dialog, notification, or error. The directory remains unchanged.

## Product decision

The project owner confirmed on July 12, 2026 that Users must not offer editing or deletion. The lifecycle action is reversible **Disable/Enable**: disabling requires confirmation and blocks future login; enabling restores login eligibility. These controls apply only to `CUSTOMER` accounts; non-customer rows expose no lifecycle action.

## Resolution evidence

- Added nullable `users.disabled_at` account state with a reversible migration.
- The Users table renders **Disable** or **Enable** only for `CUSTOMER` rows. It renders neither Edit/Delete nor customer lifecycle controls for non-customer rows.
- Disabling requires browser confirmation, clears outstanding OTP state, and prevents new OTP issuance and verification. Enabling clears the disabled state.
- The mutation requires a super-administrator session and rejects non-customer targets server-side.
- Verification on July 12, 2026: `npm test -- src/components/__tests__/UserTable.test.jsx src/lib/actions/__tests__/users.test.js src/lib/services/__tests__/customerAuth.test.js src/app/admin/users/__tests__/page.test.jsx --runInBand` passed (4 suites, 23 tests).
- Biome checks passed for the nine implementation and test files changed by this issue.

## Evidence

- Reproduced in the default desktop viewport (1280 × 720) while the live directory showed two accounts.
- Browser DOM inspection confirmed each control was uniquely present in the selected row before activation.
- After activating **Edit**, the page continued to show the same directory with no dialog or navigation.
- After activating **Delete**, no JavaScript confirmation dialog was present, the directory still contained both account rows, and there were no browser console warnings or errors.
- With permission to alter the local test database, a disposable `SHOOT` account was created successfully. Its newly rendered row showed the same **Edit** and **Delete** no-response behavior; **Delete** left the disposable row present and produced no dialog or console error.
