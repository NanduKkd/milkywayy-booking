const nextJest = require("next/jest");

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  testPathIgnorePatterns: [
    "/node_modules/",
    "\\.postgres\\.test\\.js$",
    "/src/lib/db/testing/__tests__/disposablePostgres\\.test\\.js$",
    "/src/lib/helpers/__tests__/invoicePdf\\.smoke\\.test\\.js$",
    "/src/lib/oauth/__tests__/protocol\\.integration\\.test\\.js$",
  ],
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

// next/jest prepends its own node_modules exclusions, so replace those resolved
// entries to allow the ESM-only jose package through the SWC transformer.
const resolveJestConfig = createJestConfig(config);

module.exports = async () => {
  const resolvedConfig = await resolveJestConfig();

  return {
    ...resolvedConfig,
    transformIgnorePatterns: [
      ...resolvedConfig.transformIgnorePatterns.filter(
        (pattern) => !pattern.includes("node_modules"),
      ),
      "/node_modules/(?!jose)/",
    ],
  };
};
