# Admin scheduling calendar rollout verification

- Last updated: 2026-07-21
- Verification status: `IN_PROGRESS`

## Automated release evidence

- Command: `npm run verify:scheduling-calendar-rollout`
- Result: Passed 154 tests across 30 suites with no skipped or todo release-blocking cases.
- Exact sampled booking identifiers, operator names, deployment timing, and rollback rehearsal details remain in the ignored local worksheet at `docs/private/ADMIN-SCHEDULING-CALENDAR-ROLLOUT.md`.

| Area | Verification group | Suites | Tests | Coverage |
|---|---|---:|---:|---|
| Schema and reads | Schema and read-model coverage | 4 | 9 | Calendar-event storage, bounded range reads, and the unified bookings/events/blocks query stay aligned. |
| Blocks and events | Blocking and event mutation smoke coverage | 6 | 35 | Availability precedence, exact-block conflict failures, and non-blocking event mutations remain safe. |
| Booking handoff | Preparation and handoff smoke coverage | 12 | 35 | Admin booking preparation, OTP-gated handoffs, replacement links, and WhatsApp opt-in behavior stay enforced. |
| UI and regression | Calendar UI and booking regression coverage | 8 | 75 | The admin Calendar UI, booking flows, and Time Slots regressions stay covered together for release review. |

## Localhost smoke evidence

Verified against `http://localhost:3000` on 2026-07-11:

- unauthenticated Calendar page navigation redirected to `/admin/login`;
- unauthenticated Calendar API access returned `401 Unauthorized`;
- an invalid public handoff token returned `400` and rendered the handled
  "Booking handoff unavailable" state;
- the checked pages reported no browser runtime errors.

Authenticated mutations and real Stripe, OTP, and WhatsApp delivery were not
executed in this browser pass. Those behaviors passed mocked/in-process tests
but remain part of the target-environment manual checklist below.

## Verification assessment

| Check | Assessment | Evidence or remaining work |
|---|---|---|
| Approved feature behavior | `PASS` | Current code inspection plus 154 passing tests cover exact blocks, non-blocking events, multi-property preparation, customer-state handoffs, four-hour pending holds, promotion-aware checkout, and WhatsApp default-off behavior. |
| Local authorization and error handling | `PASS` | Browser/API smoke results above. |
| Replacement-link invalidation | `PARTIAL` | Version replacement and stale-token rejection are implemented in `adminBookingHandoffs.js`; automated coverage directly exercises regeneration with synthetic service records and verifies the joined query locks only `Transaction`, but does not use persisted database records. |
| Authenticated end-to-end browser flow | `PENDING` | Requires a usable Super Admin browser session and test customer/payment setup. |
| External delivery/payment integrations | `PENDING` | Requires target-environment OTP, WhatsApp, and Stripe execution. |
| Deployment/operations gate (`CAL-304`) | `PENDING` | Migration, representative data comparison, monitoring confirmation, and rollback rehearsal are not recorded yet. |

## Manual rollout checklist

- Run the calendar-event migration in the target environment and record the operator, date, environment, and outcome in the private worksheet.
- Compare one representative week and one month view against existing Bookings and Time Slots data after deployment.
- Verify event create/update/cancel, exact block rejection on overlapping active bookings, booking preparation, both customer handoff states, payment-link regeneration, and WhatsApp default-off behavior in the target environment.
- Capture monitoring confirmation for calendar query latency, conflict response rate, handoff failures, OTP failures, WhatsApp delivery, and checkout failures before marking `CAL-304` `DONE`.
- Record rollback rehearsal notes covering mutation disablement, preserved calendar-event rows, and handoff-link revocation steps in the private worksheet.

## Notes

- This tracked report intentionally avoids storing live customer details, booking identifiers, or operator-specific production steps.
- Re-run `npm run verify:scheduling-calendar-rollout` before release review to refresh automated evidence after any scheduling calendar change.
