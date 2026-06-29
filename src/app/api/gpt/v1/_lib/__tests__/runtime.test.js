jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      json: async () => data,
      headers: new Headers(init.headers || {}),
      status: init.status || 200,
    })),
  },
}));

const {
  buildGptApiJsonResponse,
  GptApiResponseBudgetError,
  GptApiTimeoutError,
  runWithGptApiDeadline,
} = require("../runtime");

describe("GPT API runtime helper", () => {
  it("throws a typed error when a response exceeds the payload budget", () => {
    expect(() =>
      buildGptApiJsonResponse(
        {
          payload: "x".repeat(128),
        },
        {
          maxCharacters: 32,
        },
      ),
    ).toThrow(GptApiResponseBudgetError);
  });

  it("rejects long-running work before the ChatGPT platform timeout budget", async () => {
    await expect(
      runWithGptApiDeadline(
        async () =>
          new Promise((resolve) => {
            setTimeout(resolve, 25);
          }),
        {
          timeoutMs: 5,
        },
      ),
    ).rejects.toBeInstanceOf(GptApiTimeoutError);
  });
});
