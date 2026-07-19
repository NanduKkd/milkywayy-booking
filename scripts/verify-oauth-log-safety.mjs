import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();
const OAUTH_REVIEW_SCOPES = [
  "src/app/oauth",
  "src/app/api/gpt/v1",
  "src/app/api/internal/oauth",
  "src/lib/oauth",
  "src/lib/logging",
];
const OAUTH_REVIEW_FILES = ["src/lib/config/config.js"];
const ALLOWED_LOGGING_FILES = new Set([
  "src/lib/logging/security.js",
  "src/lib/oauth/audit.js",
  "src/lib/services/oauthRateLimits.js",
]);
const LIVE_SECRET_PATTERNS = [
  {
    label: "Stripe live secret key",
    pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/gu,
  },
  {
    label: "Stripe webhook secret",
    pattern: /\bwhsec_[A-Za-z0-9]{16,}\b/gu,
  },
  {
    label: "GitHub personal access token",
    pattern: /\bghp_[A-Za-z0-9]{20,}\b/gu,
  },
  {
    label: "OpenAI project secret",
    pattern: /\bsk-proj-[A-Za-z0-9_-]{16,}\b/gu,
  },
  {
    label: "OpenAI secret key",
    pattern: /\bsk-[A-Za-z0-9]{20,}\b/gu,
  },
];
const MONITORING_PACKAGE_PATTERN =
  /(sentry|bugsnag|rollbar|datadog|honeybadger)/iu;

async function collectFiles(targetPath) {
  const absolutePath = path.join(REPO_ROOT, targetPath);
  const stat = await fs.stat(absolutePath);

  if (stat.isFile()) {
    return [targetPath];
  }

  const entries = await fs.readdir(absolutePath, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") {
      continue;
    }

    const relativeChildPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(relativeChildPath)));
      continue;
    }

    files.push(relativeChildPath);
  }

  return files;
}

async function readJson(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  return JSON.parse(await fs.readFile(absolutePath, "utf8"));
}

async function findRawLoggingViolations(files) {
  const violations = [];

  for (const relativePath of files) {
    const normalizedPath = relativePath.split(path.sep).join("/");

    if (ALLOWED_LOGGING_FILES.has(normalizedPath)) {
      continue;
    }

    const contents = await fs.readFile(
      path.join(REPO_ROOT, relativePath),
      "utf8",
    );

    if (/\bconsole\.(?:error|warn|info|log)\s*\(/u.test(contents)) {
      violations.push(
        `${normalizedPath}: raw console logging is not allowed in reviewed OAuth/GPT files`,
      );
    }
  }

  return violations;
}

async function findEnvLoggingViolations(files) {
  const violations = [];

  for (const relativePath of files) {
    const contents = await fs.readFile(
      path.join(REPO_ROOT, relativePath),
      "utf8",
    );
    const matches = contents.match(
      /\bconsole\.(?:error|warn|info|log)\s*\([^)]*process\.env\.[A-Z0-9_]+/gu,
    );

    if (!matches) {
      continue;
    }

    for (const match of matches) {
      violations.push(
        `${relativePath.split(path.sep).join("/")}: environment value logged via ${match.trim()}`,
      );
    }
  }

  return violations;
}

async function findFixtureSecretViolations(files) {
  const violations = [];

  for (const relativePath of files) {
    if (!/\.(?:[cm]?js|jsx|ts|tsx|json|md)$/u.test(relativePath)) {
      continue;
    }

    const contents = await fs.readFile(
      path.join(REPO_ROOT, relativePath),
      "utf8",
    );

    for (const { label, pattern } of LIVE_SECRET_PATTERNS) {
      pattern.lastIndex = 0;

      if (pattern.test(contents)) {
        violations.push(
          `${relativePath.split(path.sep).join("/")}: detected ${label}`,
        );
      }
    }
  }

  return violations;
}

async function findMonitoringPackages() {
  const packageJson = await readJson("package.json");
  const packageNames = Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  });

  return packageNames.filter((packageName) =>
    MONITORING_PACKAGE_PATTERN.test(packageName),
  );
}

async function main() {
  const reviewedFiles = [
    ...(await Promise.all(OAUTH_REVIEW_SCOPES.map(collectFiles))).flat(),
    ...OAUTH_REVIEW_FILES,
  ];
  const fixtureScopeFiles = [
    ...(await collectFiles("src")),
    ...(await collectFiles("scripts")),
    ...(await collectFiles("src/contracts/gpt-actions")),
    "package.json",
  ];

  const [rawLoggingViolations, envLoggingViolations, fixtureSecretViolations] =
    await Promise.all([
      findRawLoggingViolations(reviewedFiles),
      findEnvLoggingViolations([
        ...reviewedFiles,
        "src/lib/config/config.js",
        "scripts/booking-auto-complete-worker.mjs",
        "scripts/oauth-cleanup-worker.mjs",
      ]),
      findFixtureSecretViolations(fixtureScopeFiles),
    ]);

  const monitoringPackages = await findMonitoringPackages();
  const violations = [
    ...rawLoggingViolations,
    ...envLoggingViolations,
    ...fixtureSecretViolations,
  ];

  if (violations.length > 0) {
    console.error("[oauth-log-safety] review failed");

    for (const violation of violations) {
      console.error(`- ${violation}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log("[oauth-log-safety] review passed");
  console.log(
    `[oauth-log-safety] reviewed ${reviewedFiles.length} OAuth/GPT files for raw logging and environment leaks`,
  );
  console.log(
    `[oauth-log-safety] reviewed ${fixtureScopeFiles.length} files for live credentials in fixtures and executable contracts`,
  );

  if (monitoringPackages.length === 0) {
    console.log(
      "[oauth-log-safety] no application error-monitoring SDK packages detected in package.json",
    );
    return;
  }

  console.log(
    `[oauth-log-safety] monitoring packages present: ${monitoringPackages.join(", ")}`,
  );
}

await main();
