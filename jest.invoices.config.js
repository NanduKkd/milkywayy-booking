const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const intentionalFailure = process.env.MW_VERIFY_INVOICE_GATE_FAILURE === "1";

/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/lib/helpers/__tests__/invoice.test.js",
    "<rootDir>/src/lib/helpers/__tests__/invoice-format.test.js",
    "<rootDir>/src/lib/helpers/__tests__/numbering.test.js",
    "<rootDir>/scripts/__tests__/invoice-quality-gate-proof.test.js",
  ],
  collectCoverageFrom: [
    "src/lib/helpers/invoice.js",
    "src/lib/helpers/invoice-format.js",
    "src/lib/helpers/numbering.js",
  ],
  coverageReporters: ["text", "text-summary", "json", "lcov"],
  coverageThreshold: {
    global: {
      statements: intentionalFailure ? 101 : 85,
      branches: 75,
    },
  },
};

module.exports = createJestConfig(config);
