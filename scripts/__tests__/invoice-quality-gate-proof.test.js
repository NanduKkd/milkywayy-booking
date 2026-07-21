const {
  assertExpectedInvoiceCoverageFailure,
} = require("../invoice-quality-gate-proof");

describe("invoice quality gate proof", () => {
  it("accepts only the intentional 101% coverage-threshold failure", () => {
    expect(() =>
      assertExpectedInvoiceCoverageFailure({
        status: 1,
        stdout:
          'Jest: "global" coverage threshold for statements (101%) not met: 96.52%',
        stderr: "",
      }),
    ).not.toThrow();
  });

  it("rejects an unrelated Jest failure instead of accepting its nonzero exit", () => {
    expect(() =>
      assertExpectedInvoiceCoverageFailure({
        status: 1,
        stdout: "FAIL src/lib/helpers/__tests__/invoice.test.js",
        stderr: "SyntaxError: unexpected token",
      }),
    ).toThrow("Expected the intentional invoice coverage-threshold diagnostic");
  });
});
