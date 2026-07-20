import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "jest",
    "--config",
    "jest.promotions.config.js",
    "--runInBand",
    "--coverage",
  ],
  {
    env: { ...process.env, MW_VERIFY_PROMOTION_GATE_FAILURE: "1" },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status === 0) {
  throw new Error(
    "Expected the intentional 101% promotion statement threshold to fail",
  );
}

console.log(
  "Intentional promotion coverage threshold failure correctly stopped the gate.",
);
