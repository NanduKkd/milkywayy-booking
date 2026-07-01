import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  renderPrivateRolloutWorksheet,
  renderRolloutVerificationReport,
  rolloutVerificationGroups,
} from "./lib/adminAnalyticsFinanceRolloutReport.mjs";

const jestBin = "./node_modules/.bin/jest";
const trackedReportOutputPath = path.join(
  process.cwd(),
  "docs/admin-analytics-finance/ROLLOUT-VERIFICATION.md",
);
const privateWorksheetOutputPath = path.join(
  process.cwd(),
  "docs/private/ADMIN-ANALYTICS-FINANCE-ROLLOUT.md",
);

function formatReportDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  }).format(value);
}

async function runGroup(group) {
  console.log(`\n[finance-rollout] ${group.taskId} ${group.name}`);

  const outputFile = path.join(
    os.tmpdir(),
    `finance-rollout-${process.pid}-${group.taskId.toLowerCase()}.json`,
  );

  const result = spawnSync(
    jestBin,
    [
      "--runInBand",
      "--runTestsByPath",
      ...group.tests,
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
      throw new Error(
        `${group.taskId} ${group.name} failed with exit code ${result.status ?? 1}.`,
      );
    }

    const report = JSON.parse(await fs.readFile(outputFile, "utf8"));
    const skippedTests = report.numPendingTests ?? 0;
    const todoTests = report.numTodoTests ?? 0;

    if (skippedTests > 0 || todoTests > 0) {
      throw new Error(
        `${group.taskId} ${group.name} reported ${skippedTests} skipped and ${todoTests} todo tests.`,
      );
    }

    return {
      ...group,
      suiteCount: report.numPassedTestSuites ?? 0,
      testCount: report.numPassedTests ?? 0,
    };
  } finally {
    await fs.rm(outputFile, { force: true });
  }
}

async function ensurePrivateWorksheet(date) {
  await fs.mkdir(path.dirname(privateWorksheetOutputPath), { recursive: true });

  try {
    await fs.access(privateWorksheetOutputPath);
    console.log(
      `[finance-rollout] Preserved existing private worksheet at ${privateWorksheetOutputPath}.`,
    );
  } catch {
    await fs.writeFile(
      privateWorksheetOutputPath,
      renderPrivateRolloutWorksheet({
        date,
        trackedReportPath:
          "docs/admin-analytics-finance/ROLLOUT-VERIFICATION.md",
      }),
      "utf8",
    );
    console.log(
      `[finance-rollout] Created private worksheet template at ${privateWorksheetOutputPath}.`,
    );
  }
}

async function main() {
  const completedGroups = [];

  for (const group of rolloutVerificationGroups) {
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
  const date = formatReportDate(new Date());

  await fs.writeFile(
    trackedReportOutputPath,
    renderRolloutVerificationReport({
      command: "npm run verify:finance-rollout",
      date,
      groups: completedGroups,
      privateEvidencePath: "docs/private/ADMIN-ANALYTICS-FINANCE-ROLLOUT.md",
      totalSuites,
      totalTests,
    }),
    "utf8",
  );
  await ensurePrivateWorksheet(date);

  console.log(
    `\n[finance-rollout] Wrote the updated tracked report to ${trackedReportOutputPath}.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(`\n[finance-rollout] ${error.message}`);
  process.exit(1);
}
