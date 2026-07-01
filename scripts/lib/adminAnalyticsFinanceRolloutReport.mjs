export const rolloutVerificationGroups = [
  {
    description:
      "Shared aggregation totals stay reconciled across dashboard, reports, and drill-down analytics.",
    name: "Calculation and reconciliation coverage",
    taskId: "FIN-301",
    tests: ["src/lib/services/__tests__/financialAggregation.test.js"],
  },
  {
    description:
      "Expense authorization, validation, soft deletion, and audit evidence remain enforced.",
    name: "Expense authorization and audit coverage",
    taskId: "FIN-302",
    tests: [
      "src/lib/services/__tests__/expenseAdmin.test.js",
      "src/app/api/admin/expenses/__tests__/route.test.js",
      "src/app/api/admin/expenses/[id]/__tests__/route.test.js",
    ],
  },
  {
    description:
      "CSV, Excel, and PDF exports reconcile to report APIs and neutralize spreadsheet injection input.",
    name: "Export equivalence and output safety coverage",
    taskId: "FIN-303",
    tests: [
      "src/lib/services/__tests__/financialReportExport.test.js",
      "src/app/api/admin/analytics/reports/export/__tests__/route.test.js",
      "src/app/api/admin/analytics/reports/__tests__/route.test.js",
    ],
  },
  {
    description:
      "Bounded finance data loading, query windows, and representative volume gates stay in place.",
    name: "Volume, indexes, and bounded-query coverage",
    taskId: "FIN-304",
    tests: [
      "src/lib/services/__tests__/financialAnalyticsData.test.js",
      "src/lib/services/__tests__/financialAnalyticsVolume.test.js",
      "src/lib/db/migrations/__tests__/20260702100000-add-financial-analytics-indexes.test.js",
      "src/app/api/admin/analytics/dashboard/__tests__/route.test.js",
      "src/app/api/admin/analytics/drill-down/__tests__/route.test.js",
    ],
  },
];

function renderGroupRows(groups) {
  return groups
    .map(
      (group) =>
        `| ${group.taskId} | ${group.name} | ${group.suiteCount} | ${group.testCount} | ${group.description} |`,
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
  return `# Admin analytics and finance rollout verification

- Last updated: ${date}
- Verification status: \`IN_PROGRESS\`

## Automated release evidence

- Command: \`${command}\`
- Result: Passed ${totalTests} tests across ${totalSuites} suites with no skipped or todo release-blocking cases.
- Exact sampled totals, finance signoff notes, operator names, deployment timing, and rollback rehearsal details remain in the ignored private worksheet at \`${privateEvidencePath}\`.

| Task | Verification group | Suites | Tests | Coverage |
|---|---|---:|---:|---|
${renderGroupRows(groups)}

## Manual rollout checklist

- Reconcile at least one normal month, one refund month, one empty month, and one boundary month using the private worksheet.
- Record dashboard, reports, drill-down, and export totals for each sampled range in the private worksheet rather than in tracked docs.
- Capture finance signoff, rollback rehearsal notes, and monitoring confirmation in the private worksheet before marking \`FIN-305\` \`DONE\`.

## Notes

- This tracked report intentionally avoids storing live business totals or operator-specific production details.
- Re-run \`${command}\` before release review to refresh automated evidence after any finance analytics change.
`;
}

export function renderPrivateRolloutWorksheet({ date, trackedReportPath }) {
  return `# Private admin analytics and finance rollout worksheet

- Last prepared: ${date}
- Commit policy: Do not commit this file.
- Tracked companion report: \`${trackedReportPath}\`

## Sampled reconciliation ranges

Record exact figures here for:

- Normal month
- Refund month
- Empty month
- Boundary month

For each range, capture:

- Dashboard KPIs
- Financial Reports KPIs and P&L
- Matching drill-down totals
- CSV, Excel, and PDF export totals
- Notes on any discrepancies and their resolution

## Finance signoff

- Approver:
- Date:
- Decision:
- Notes:

## Rollback rehearsal

- Operator:
- Date:
- What was exercised:
- Outcome:

## Monitoring confirmation

- Operator:
- Date:
- Dashboards/logs reviewed:
- Outcome:

## Blockers or follow-up actions

- None recorded yet.
`;
}
