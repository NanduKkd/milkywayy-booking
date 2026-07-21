import { spawnSync } from "node:child_process";
import proof from "./invoice-quality-gate-proof.js";

const { assertExpectedInvoiceCoverageFailure } = proof;

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["jest", "--config", "jest.invoices.config.js", "--runInBand", "--coverage"],
  {
    env: { ...process.env, MW_VERIFY_INVOICE_GATE_FAILURE: "1" },
    encoding: "utf8",
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

assertExpectedInvoiceCoverageFailure(result);

console.log(
  "Intentional invoice coverage threshold failure correctly stopped the gate.",
);
