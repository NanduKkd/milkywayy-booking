export const rolloutVerificationGroups = [
  {
    area: "Schema and reads",
    description:
      "Calendar-event storage, bounded range reads, and the unified bookings/events/blocks query stay aligned.",
    name: "Schema and read-model coverage",
    tests: [
      "src/lib/db/migrations/__tests__/20260702113000-create-calendar-events.test.js",
      "src/lib/db/models/__tests__/calendarevent.test.js",
      "src/lib/services/__tests__/adminSchedulingCalendar.test.js",
      "src/app/api/admin/scheduling-calendar/__tests__/route.test.js",
    ],
  },
  {
    area: "Blocks and events",
    description:
      "Availability precedence, exact-block conflict failures, and non-blocking event mutations remain safe.",
    name: "Blocking and event mutation smoke coverage",
    tests: [
      "src/lib/services/__tests__/schedulingAvailability.test.js",
      "src/lib/services/__tests__/schedulingConflictRevalidation.test.js",
      "src/lib/services/__tests__/adminCalendarEvents.test.js",
      "src/app/api/admin/timeslots/__tests__/route.test.js",
      "src/app/api/admin/scheduling-calendar/events/__tests__/route.test.js",
      "src/app/api/admin/scheduling-calendar/events/[id]/__tests__/route.test.js",
    ],
  },
  {
    area: "Booking handoff",
    description:
      "Admin booking preparation, nullable customer snapshots, OTP-gated handoffs, replacement links, and WhatsApp opt-in behavior stay enforced.",
    name: "Preparation and handoff smoke coverage",
    tests: [
      "src/lib/services/__tests__/adminBookingPreparation.test.js",
      "src/lib/services/__tests__/adminBookingHandoffs.test.js",
      "src/lib/services/__tests__/adminBookingHandoffState.test.js",
      "src/lib/services/__tests__/adminBookingHandoffNotifications.test.js",
      "src/lib/notifications/__tests__/whatsapp.test.js",
      "src/app/api/admin/scheduling-calendar/customers/__tests__/route.test.js",
      "src/app/api/admin/scheduling-calendar/booking-preparation/__tests__/route.test.js",
      "src/app/api/admin/scheduling-calendar/booking-handoffs/__tests__/route.test.js",
      "src/app/api/booking-handoffs/[token]/__tests__/route.test.js",
      "src/app/api/booking-handoffs/[token]/otp/__tests__/route.test.js",
      "src/app/api/booking-handoffs/[token]/verify-otp/__tests__/route.test.js",
      "src/app/api/booking-handoffs/[token]/checkout/__tests__/route.test.js",
    ],
  },
  {
    area: "UI and regression",
    description:
      "The admin Calendar UI, booking flows, and Time Slots regressions stay covered together for release review.",
    name: "Calendar UI and booking regression coverage",
    tests: [
      "src/app/admin/scheduling-calendar/__tests__/SchedulingCalendarPage.test.jsx",
      "src/components/admin/__tests__/AdminSidebarNav.test.jsx",
      "src/app/admin/__tests__/page.test.jsx",
      "src/lib/actions/__tests__/bookings.test.js",
      "src/lib/helpers/__tests__/bookingUtils.test.js",
      "src/components/__tests__/DateSlotPicker.test.jsx",
      "src/app/booking/__tests__/BookNew.test.jsx",
      "src/app/api/admin/bookings/__tests__/route.test.js",
    ],
  },
];

function renderGroupRows(groups) {
  return groups
    .map(
      (group) =>
        `| ${group.area} | ${group.name} | ${group.suiteCount} | ${group.testCount} | ${group.description} |`,
    )
    .join("\n");
}

export function renderRolloutVerificationReport({
  command,
  date,
  groups,
  privateEvidencePath,
  totalSuites,
  totalTests,
}) {
  return `# Admin scheduling calendar rollout verification

- Last updated: ${date}
- Verification status: \`IN_PROGRESS\`

## Automated release evidence

- Command: \`${command}\`
- Result: Passed ${totalTests} tests across ${totalSuites} suites with no skipped or todo release-blocking cases.
- Exact sampled booking identifiers, operator names, deployment timing, and rollback rehearsal details remain in the ignored local worksheet at \`${privateEvidencePath}\`.

| Area | Verification group | Suites | Tests | Coverage |
|---|---|---:|---:|---|
${renderGroupRows(groups)}

## Localhost smoke evidence

Verified against \`http://localhost:3000\` on 2026-07-11:

- unauthenticated Calendar page navigation redirected to \`/admin/login\`;
- unauthenticated Calendar API access returned \`401 Unauthorized\`;
- an invalid public handoff token returned \`400\` and rendered the handled
  "Booking handoff unavailable" state;
- the checked pages reported no browser runtime errors.

Authenticated mutations and real Stripe, OTP, and WhatsApp delivery were not
executed in this browser pass. Those behaviors passed mocked/in-process tests
but remain part of the target-environment manual checklist below.

## Verification assessment

| Check | Assessment | Evidence or remaining work |
|---|---|---|
| Approved feature behavior | \`PASS\` | Current code inspection plus ${totalTests} passing tests cover exact blocks, non-blocking events, multi-property preparation, customer-state handoffs, four-hour pending holds, promotion-aware checkout, and WhatsApp default-off behavior. |
| Local authorization and error handling | \`PASS\` | Browser/API smoke results above. |
| Handoff registration and transaction safety | \`PASS\` | Synthetic service coverage accepts persisted null optional fields for Individual OTP registration, preserves Company field requirements, verifies relation initialization at the handoff boundary, and exercises joined OTP, regeneration, and checkout queries that lock only \`Transaction\`. |
| Authenticated end-to-end browser flow | \`PENDING\` | Requires a usable Super Admin browser session and test customer/payment setup. |
| External delivery/payment integrations | \`PENDING\` | Requires target-environment OTP, WhatsApp, and Stripe execution. |
| Deployment/operations gate (\`CAL-304\`) | \`PENDING\` | Migration, representative data comparison, monitoring confirmation, and rollback rehearsal are not recorded yet. |

## Manual rollout checklist

- Run the calendar-event migration in the target environment and record the operator, date, environment, and outcome in the private worksheet.
- Compare one representative week and one month view against existing Bookings and Time Slots data after deployment.
- Verify event create/update/cancel, exact block rejection on overlapping active bookings, booking preparation, both customer handoff states, payment-link regeneration, and WhatsApp default-off behavior in the target environment.
- Capture monitoring confirmation for calendar query latency, conflict response rate, handoff failures, OTP failures, WhatsApp delivery, and checkout failures before marking \`CAL-304\` \`DONE\`.
- Record rollback rehearsal notes covering mutation disablement, preserved calendar-event rows, and handoff-link revocation steps in the private worksheet.

## Notes

- This tracked report intentionally avoids storing live customer details, booking identifiers, or operator-specific production steps.
- Re-run \`${command}\` before release review to refresh automated evidence after any scheduling calendar change.
`;
}

export function renderPrivateRolloutWorksheet({ date, trackedReportPath }) {
  return `# Private admin scheduling calendar rollout worksheet

- Last prepared: ${date}
- Commit policy: Do not commit this file.
- Tracked companion report: \`${trackedReportPath}\`

## Migration execution

- Operator:
- Date:
- Environment:
- Steps executed:
- Outcome:
- Notes:

## Calendar smoke checks

Record exact identifiers and outcomes for:

- One representative week view
- One representative month view
- Event create/update/cancel
- Exact block creation and overlapping-active-booking rejection
- Existing-customer booking handoff
- New-customer booking handoff with OTP
- Payment-link copy and replacement-link invalidation
- WhatsApp opt-in and default-off verification

## Monitoring confirmation

- Operator:
- Date:
- Dashboards/logs reviewed:
- Outcome:

## Rollback rehearsal

- Operator:
- Date:
- What was exercised:
- Outcome:

## Blockers or follow-up actions

- None recorded yet.
`;
}
