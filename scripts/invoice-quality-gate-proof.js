const EXPECTED_THRESHOLD_DIAGNOSTIC =
  /Jest: "global" coverage threshold for statements \(101%\) not met:/;

function assertExpectedInvoiceCoverageFailure(result) {
  if (result.error) throw result.error;

  if (result.status === 0) {
    throw new Error(
      "Expected the intentional 101% invoice statement threshold to fail",
    );
  }

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (!EXPECTED_THRESHOLD_DIAGNOSTIC.test(output)) {
    throw new Error(
      "Expected the intentional invoice coverage-threshold diagnostic; refusing to treat an unrelated Jest failure as proof.",
    );
  }
}

module.exports = { assertExpectedInvoiceCoverageFailure };
