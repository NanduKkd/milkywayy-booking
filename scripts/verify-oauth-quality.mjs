import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const biomeBin = "./node_modules/.bin/biome";
const jestBin = "./node_modules/.bin/jest";

const biomeTargets = [
  "docs/gpt-actions-oauth",
  "scripts/provision-oauth-client.mjs",
  "scripts/oauth-cleanup-worker.mjs",
  "scripts/verify-oauth-log-safety.mjs",
  "scripts/verify-oauth-quality.mjs",
  "scripts/verify-oauth-security.mjs",
  "src/app/api/gpt/v1",
  "src/app/api/internal/oauth",
  "src/app/dashboard/connections",
  "src/app/dashboard/files",
  "src/app/oauth",
  "src/components/DashboardLoginModal.js",
  "src/components/LoginModal.js",
  "src/lib/actions/auth.js",
  "src/lib/config/oauth.js",
  "src/lib/config/session.js",
  "src/lib/config/__tests__/oauth.test.js",
  "src/lib/config/__tests__/session.test.js",
  "src/lib/contexts/auth.js",
  "src/lib/contexts/__tests__/auth.test.jsx",
  "src/lib/db/migrations/20260629000000-add-customer-auth-otp-controls.js",
  "src/lib/db/migrations/20260629010000-create-oauth-persistence.js",
  "src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js",
  "src/lib/db/models/__tests__/oauthmodels.test.js",
  "src/lib/db/models/index.js",
  "src/lib/db/models/oauthaccesstoken.js",
  "src/lib/db/models/oauthauditevent.js",
  "src/lib/db/models/oauthauthorizationcode.js",
  "src/lib/db/models/oauthclient.js",
  "src/lib/db/models/oauthconsent.js",
  "src/lib/db/models/oauthmodelutils.js",
  "src/lib/db/models/oauthratelimit.js",
  "src/lib/db/models/oauthrefreshtoken.js",
  "src/lib/db/models/user.js",
  "src/lib/db/relations.js",
  "src/lib/helpers/auth.js",
  "src/lib/logging/security.js",
  "src/lib/logging/__tests__/security.test.js",
  "src/lib/oauth",
  "src/lib/services/customerAuth.js",
  "src/lib/services/oauthRateLimits.js",
  "src/lib/services/__tests__/customerAuth.test.js",
  "src/lib/services/__tests__/oauthRateLimits.test.js",
  "src/proxy.js",
  "src/__tests__/proxy.test.js",
];

const jestSuites = [
  "docs/gpt-actions-oauth/__tests__/gpt-action-openapi.test.js",
  "src/lib/config/__tests__/oauth.test.js",
  "src/lib/config/__tests__/session.test.js",
  "src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js",
  "src/lib/db/models/__tests__/oauthmodels.test.js",
  "src/lib/contexts/__tests__/auth.test.jsx",
  "src/lib/logging/__tests__/security.test.js",
  "src/lib/oauth/__tests__/accessTokens.test.js",
  "src/lib/oauth/__tests__/audit.test.js",
  "src/lib/oauth/__tests__/authorizationCodes.test.js",
  "src/lib/oauth/__tests__/authorizationCsrf.test.js",
  "src/lib/oauth/__tests__/authorizationDecision.test.js",
  "src/lib/oauth/__tests__/authorizationRequest.test.js",
  "src/lib/oauth/__tests__/authorizationResume.test.js",
  "src/lib/oauth/__tests__/cleanup.test.js",
  "src/lib/oauth/__tests__/clientAuthentication.test.js",
  "src/lib/oauth/__tests__/clientProvisioning.test.js",
  "src/lib/oauth/__tests__/consent.test.js",
  "src/lib/oauth/__tests__/interaction.test.js",
  "src/lib/oauth/__tests__/protocol.integration.test.js",
  "src/lib/oauth/__tests__/scopes.test.js",
  "src/lib/oauth/__tests__/secrets.test.js",
  "src/lib/oauth/__tests__/tokenExchange.test.js",
  "src/lib/services/__tests__/customerAuth.test.js",
  "src/lib/services/__tests__/oauthRateLimits.test.js",
  "src/__tests__/proxy.test.js",
  "src/app/api/gpt/v1/_lib/__tests__/auth.test.js",
  "src/app/api/gpt/v1/_lib/__tests__/dtos.test.js",
  "src/app/api/gpt/v1/_lib/__tests__/runtime.test.js",
  "src/app/api/gpt/v1/bookings/__tests__/route.test.js",
  "src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js",
  "src/app/api/gpt/v1/files/__tests__/route.test.js",
  "src/app/api/gpt/v1/invoices/__tests__/route.test.js",
  "src/app/api/gpt/v1/me/__tests__/route.test.js",
  "src/app/api/internal/oauth/cleanup/__tests__/route.test.js",
  "src/app/dashboard/connections/__tests__/page.test.jsx",
  "src/app/dashboard/files/__tests__/FileList.test.jsx",
  "src/app/dashboard/files/__tests__/page.test.jsx",
  "src/app/oauth/authorize/__tests__/page.test.jsx",
  "src/app/oauth/authorize/decision/__tests__/route.test.js",
  "src/app/oauth/authorize/resume/__tests__/route.test.js",
  "src/app/oauth/revoke/__tests__/route.test.js",
  "src/app/oauth/token/__tests__/route.test.js",
];

function runCommand(label, command, args) {
  console.log(`\n[oauth-quality] ${label}`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 1}.`);
  }
}

async function verifyJestResults(reportPath) {
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const skippedTests = report.numPendingTests ?? 0;
  const todoTests = report.numTodoTests ?? 0;

  if (skippedTests > 0 || todoTests > 0) {
    throw new Error(
      `release-blocking Jest suites reported ${skippedTests} skipped and ${todoTests} todo tests`,
    );
  }

  console.log(
    `[oauth-quality] Jest passed ${report.numPassedTests} tests across ${report.numPassedTestSuites} suites with no skipped/todo release-blocking cases.`,
  );
}

async function main() {
  runCommand("Biome review", biomeBin, ["check", ...biomeTargets]);

  const reportPath = path.join(
    os.tmpdir(),
    `oauth-quality-jest-report-${process.pid}.json`,
  );

  try {
    runCommand("Focused Jest review", jestBin, [
      "--runInBand",
      "--runTestsByPath",
      ...jestSuites,
      "--json",
      `--outputFile=${reportPath}`,
    ]);
    await verifyJestResults(reportPath);
  } finally {
    await fs.rm(reportPath, { force: true });
  }

  runCommand("Log and secret review", "npm", [
    "run",
    "verify:oauth-log-safety",
  ]);

  console.log(
    `\n[oauth-quality] Reviewed ${biomeTargets.length} Biome targets and ${jestSuites.length} release-blocking Jest suites.`,
  );
  console.log(
    "[oauth-quality] Independent review remains preferred when staffing permits; any staffing exception must stay documented in docs/gpt-actions-oauth/DECISIONS.md.",
  );
}

await main();
