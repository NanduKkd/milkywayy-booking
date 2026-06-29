import { spawnSync } from "node:child_process";

const jestBin = "./node_modules/.bin/jest";

const groups = [
  {
    name: "Configuration, models, and secrets",
    tests: [
      "src/lib/config/__tests__/oauth.test.js",
      "src/lib/db/models/__tests__/oauthmodels.test.js",
      "src/lib/oauth/__tests__/secrets.test.js",
    ],
  },
  {
    name: "Authorization request, consent, and resume flow",
    tests: [
      "src/lib/oauth/__tests__/authorizationRequest.test.js",
      "src/lib/oauth/__tests__/authorizationResume.test.js",
      "src/lib/oauth/__tests__/authorizationCsrf.test.js",
      "src/lib/oauth/__tests__/authorizationDecision.test.js",
      "src/lib/oauth/__tests__/interaction.test.js",
      "src/lib/oauth/__tests__/scopes.test.js",
      "src/app/oauth/authorize/__tests__/page.test.jsx",
      "src/app/oauth/authorize/resume/__tests__/route.test.js",
      "src/app/oauth/authorize/decision/__tests__/route.test.js",
    ],
  },
  {
    name: "Token exchange, refresh rotation, and revocation",
    tests: [
      "src/lib/oauth/__tests__/authorizationCodes.test.js",
      "src/lib/oauth/__tests__/clientAuthentication.test.js",
      "src/lib/oauth/__tests__/tokenExchange.test.js",
      "src/lib/oauth/__tests__/accessTokens.test.js",
      "src/lib/oauth/__tests__/consent.test.js",
      "src/app/oauth/token/__tests__/route.test.js",
      "src/app/oauth/revoke/__tests__/route.test.js",
      "src/lib/oauth/__tests__/protocol.integration.test.js",
      "src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js",
    ],
  },
  {
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
    name: "Rate limits, audit logging, and cleanup",
    tests: [
      "src/lib/services/__tests__/customerAuth.test.js",
      "src/lib/services/__tests__/oauthRateLimits.test.js",
      "src/lib/oauth/__tests__/audit.test.js",
      "src/lib/oauth/__tests__/cleanup.test.js",
      "src/app/api/internal/oauth/cleanup/__tests__/route.test.js",
    ],
  },
];

const runGroup = ({ name, tests }) => {
  console.log(`\n[oauth-security] ${name}`);

  const result = spawnSync(
    jestBin,
    ["--runInBand", "--runTestsByPath", ...tests],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    throw new Error(`${name} failed with exit code ${result.status ?? 1}.`);
  }
};

try {
  for (const group of groups) {
    runGroup(group);
  }

  console.log(
    "\n[oauth-security] All automated security verification groups passed.",
  );
  console.log(
    "[oauth-security] Remaining release-blocking work is limited to manual browser, Custom GPT, production-topology, and explicit log-review checks tracked in docs/gpt-actions-oauth/SECURITY-TEST-PLAN.md.",
  );
} catch (error) {
  console.error(`\n[oauth-security] ${error.message}`);
  process.exit(1);
}
