const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const intentionalFailure = process.env.MW_VERIFY_PROMOTION_GATE_FAILURE === "1";

/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/lib/actions/__tests__/promotions.test.js",
    "<rootDir>/src/app/admin/promotions/__tests__/PromotionManager.test.jsx",
    "<rootDir>/src/app/admin/promotions/__tests__/page.test.jsx",
    "<rootDir>/src/lib/services/__tests__/promotionAdmin.test.js",
    "<rootDir>/src/lib/services/__tests__/promotionEngine.test.js",
    "<rootDir>/src/lib/services/__tests__/promotionRedemptions.test.js",
    "<rootDir>/src/lib/services/__tests__/promotionCheckout.test.js",
    "<rootDir>/src/lib/services/__tests__/promotionPricing.test.js",
    "<rootDir>/src/lib/services/__tests__/promotionMigrationParity.test.js",
    "<rootDir>/src/lib/db/migrations/__tests__/20260701010000-create-promotions-core-schema.test.js",
  ],
  collectCoverageFrom: [
    "src/lib/actions/promotions.js",
    "src/app/admin/promotions/PromotionManager.jsx",
    "src/app/admin/promotions/page.jsx",
    "src/lib/services/promotionAdmin.js",
    "src/lib/services/promotionEngine.js",
    "src/lib/services/promotionRedemptions.js",
    "src/lib/services/promotionCheckout.js",
    "src/lib/services/promotionPricing.js",
    "src/lib/helpers/promotionPricing.js",
  ],
  coverageReporters: ["text", "text-summary", "json", "lcov"],
  coverageThreshold: {
    global: {
      statements: intentionalFailure ? 101 : 85,
      branches: 75,
    },
    "src/lib/actions/promotions.js": {
      statements: 90,
      branches: 80,
    },
  },
};

module.exports = createJestConfig(config);
