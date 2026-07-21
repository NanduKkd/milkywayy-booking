import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["jest", "--config", "jest.invoices.config.js", "--runInBand", "--coverage"],
  {
    env: { ...process.env, MW_VERIFY_INVOICE_GATE_FAILURE: "1" },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;

if (result.status === 0) {
  throw new Error(
    "Expected the intentional 101% invoice statement threshold to fail",
  );
}

console.log(
  "Intentional invoice coverage threshold failure correctly stopped the gate.",
);
