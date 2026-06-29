export const securityVerificationGroups = [
  {
    caseIds: ["CFG-01", "CFG-02", "CFG-03", "CFG-04"],
    name: "Configuration, models, and secrets",
    tests: [
      "src/lib/config/__tests__/oauth.test.js",
      "src/lib/db/models/__tests__/oauthmodels.test.js",
      "src/lib/oauth/__tests__/secrets.test.js",
      "src/lib/oauth/__tests__/clientProvisioning.test.js",
    ],
  },
  {
    caseIds: [
      "AUT-01",
      "AUT-02",
      "AUT-03",
      "AUT-04",
      "AUT-05",
      "AUT-06",
      "AUT-07",
      "AUT-08",
      "AUT-09",
      "AUT-10",
      "AUT-11",
      "AUT-12",
      "AUT-13",
    ],
    name: "Authorization request, consent, and resume flow",
    tests: [
      "src/lib/oauth/__tests__/authorizationRequest.test.js",
      "src/lib/oauth/__tests__/authorizationResume.test.js",
      "src/lib/oauth/__tests__/authorizationCsrf.test.js",
      "src/lib/oauth/__tests__/authorizationDecision.test.js",
      "src/lib/oauth/__tests__/interaction.test.js",
      "src/lib/oauth/__tests__/scopes.test.js",
      "src/lib/oauth/__tests__/consent.test.js",
      "src/lib/contexts/__tests__/auth.test.jsx",
      "src/app/oauth/authorize/__tests__/page.test.jsx",
      "src/app/oauth/authorize/resume/__tests__/route.test.js",
      "src/app/oauth/authorize/decision/__tests__/route.test.js",
    ],
  },
  {
    caseIds: [
      "COD-01",
      "COD-02",
      "COD-03",
      "COD-04",
      "COD-05",
      "COD-06",
      "COD-07",
      "COD-08",
      "COD-09",
      "COD-10",
      "COD-11",
      "REF-01",
      "REF-02",
      "REF-03",
      "REF-04",
      "REF-05",
      "REF-06",
    ],
    name: "Token exchange, refresh rotation, and revocation",
    tests: [
      "src/lib/oauth/__tests__/authorizationCodes.test.js",
      "src/lib/oauth/__tests__/clientAuthentication.test.js",
      "src/lib/oauth/__tests__/tokenExchange.test.js",
      "src/lib/oauth/__tests__/accessTokens.test.js",
      "src/lib/oauth/__tests__/consent.test.js",
      "src/app/oauth/token/__tests__/route.test.js",
      "src/app/oauth/revoke/__tests__/route.test.js",
      "src/app/dashboard/connections/__tests__/page.test.jsx",
      "src/lib/oauth/__tests__/protocol.integration.test.js",
      "src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js",
    ],
  },
  {
    caseIds: [
      "API-01",
      "API-02",
      "API-03",
      "API-04",
      "API-05",
      "API-06",
      "API-07",
      "API-08",
      "API-09",
      "API-10",
      "API-11",
      "API-12",
      "RES-03",
      "RES-04",
      "LOG-03",
    ],
    name: "Resource API authorization, bounds, and deep links",
    tests: [
      "src/app/api/gpt/v1/_lib/__tests__/auth.test.js",
      "src/app/api/gpt/v1/_lib/__tests__/dtos.test.js",
      "src/app/api/gpt/v1/_lib/__tests__/runtime.test.js",
      "src/app/api/gpt/v1/me/__tests__/route.test.js",
      "src/app/api/gpt/v1/bookings/__tests__/route.test.js",
      "src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js",
      "src/app/api/gpt/v1/invoices/__tests__/route.test.js",
      "src/app/api/gpt/v1/files/__tests__/route.test.js",
      "src/app/dashboard/files/__tests__/page.test.jsx",
      "src/app/dashboard/files/__tests__/FileList.test.jsx",
    ],
  },
  {
    caseIds: [
      "LOG-01",
      "LOG-04",
      "LOG-05",
      "LOG-06",
      "RES-01",
      "RES-02",
      "RES-05",
      "RES-06",
    ],
    name: "Rate limits, audit logging, and cleanup",
    tests: [
      "src/lib/services/__tests__/customerAuth.test.js",
      "src/lib/services/__tests__/oauthRateLimits.test.js",
      "src/lib/logging/__tests__/security.test.js",
      "src/lib/oauth/__tests__/audit.test.js",
      "src/lib/oauth/__tests__/cleanup.test.js",
      "src/app/api/internal/oauth/cleanup/__tests__/route.test.js",
      "src/lib/oauth/__tests__/protocol.integration.test.js",
    ],
  },
];

export const pendingSecurityCases = [
  {
    id: "MAN-*",
    reason:
      "Manual browser verification still requires operator-driven OTP, consent, denial, reconnect, and dashboard disconnect checks.",
  },
  {
    id: "GPT-*",
    reason:
      "End-to-end Custom GPT verification still requires the actual GPT editor, callback registration, and two production-like customer accounts.",
  },
  {
    id: "GATE-07/GATE-08",
    reason:
      "Live production TLS, topology, rollback rehearsal, and emergency disablement still need host-level execution beyond the repo-managed templates.",
  },
];

function formatGroupCaseList(group) {
  return group.caseIds.join(", ");
}

function renderGroupTable(groups) {
  return groups
    .map(
      (group) =>
        `| ${group.name} | ${group.suiteCount} suites | ${group.testCount} tests | ${formatGroupCaseList(group)} |`,
    )
    .join("\n");
}

function renderPendingList() {
  return pendingSecurityCases
    .map((entry) => `- ${entry.id}: ${entry.reason}`)
    .join("\n");
}

export function renderSecurityVerificationReport({
  command,
  date,
  groups,
  totalSuites,
  totalTests,
}) {
  return `# OAuth security verification report

- Last run: ${date}
- Status: \`IN_PROGRESS\`
- Command: \`${command}\`

## Automated verification result

The automated OAuth/GPT security verification runner completed successfully on ${date}.

Result summary:

- ${totalSuites} grouped suite executions passed.
- ${totalTests} tests executed across those verification groups.
- No failing automated abuse-case checks were observed.
- No critical or high-severity finding was opened by this automated run.

## Automated case matrix

| Verification group | Evidence | Coverage |
|---|---:|---:|
${renderGroupTable(groups)}

The current automated run materially covers these security-plan cases:

${groups.map((group) => `- ${group.name}: ${formatGroupCaseList(group)}`).join("\n")}

## Companion verification commands

- \`npm run verify:oauth-log-safety\`: keeps the separate log and secret-leak review current for \`LOG-02\`.
- \`npm run verify:oauth-quality\`: keeps the focused Biome and release-blocking Jest quality gate current for \`GATE-02\`.
- \`npm run verify:oauth-topology\`: verifies the repo-managed Nginx and PM2 topology, but live host validation remains a production rollout task.

## Remaining release-blocking work

${renderPendingList()}
`;
}
