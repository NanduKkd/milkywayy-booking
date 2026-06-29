import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  renderSecurityVerificationReport,
  securityVerificationGroups,
} from "./lib/oauthSecurityReport.mjs";

const jestBin = "./node_modules/.bin/jest";
const reportOutputPath = path.join(
  process.cwd(),
  "docs/gpt-actions-oauth/SECURITY-VERIFICATION-REPORT.md",
);

async function runGroup({ caseIds, name, tests }) {
  console.log(`\n[oauth-security] ${name}`);

  const outputFile = path.join(
    os.tmpdir(),
    `oauth-security-${process.pid}-${name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/gu, "-")}.json`,
  );

  const result = spawnSync(
    jestBin,
    [
      "--runInBand",
      "--runTestsByPath",
      ...tests,
      "--json",
      `--outputFile=${outputFile}`,
    ],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  try {
    if (result.status !== 0) {
      throw new Error(`${name} failed with exit code ${result.status ?? 1}.`);
    }

    const report = JSON.parse(await fs.readFile(outputFile, "utf8"));

    return {
      caseIds,
      name,
      suiteCount: report.numPassedTestSuites ?? 0,
      testCount: report.numPassedTests ?? 0,
    };
  } finally {
    await fs.rm(outputFile, { force: true });
  }
}

async function main() {
  const completedGroups = [];

  for (const group of securityVerificationGroups) {
    completedGroups.push(await runGroup(group));
  }

  const totalSuites = completedGroups.reduce(
    (sum, group) => sum + group.suiteCount,
    0,
  );
  const totalTests = completedGroups.reduce(
    (sum, group) => sum + group.testCount,
    0,
  );
  const date = new Date().toISOString().slice(0, 10);

  await fs.writeFile(
    reportOutputPath,
    renderSecurityVerificationReport({
      command: "npm run verify:oauth-security",
      date,
      groups: completedGroups,
      totalSuites,
      totalTests,
    }),
    "utf8",
  );

  console.log(
    "\n[oauth-security] All automated security verification groups passed.",
  );
  console.log(
    `[oauth-security] Wrote the updated security report to ${reportOutputPath}.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(`\n[oauth-security] ${error.message}`);
  process.exit(1);
}
