import { NextResponse } from "next/server";

export const GPT_API_MAX_RESPONSE_CHARACTERS = 80_000;
export const GPT_API_ROUTE_TIMEOUT_MS = 15_000;

const GPT_API_JSON_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
});

export class GptApiResponseBudgetError extends Error {
  constructor({
    maxCharacters = GPT_API_MAX_RESPONSE_CHARACTERS,
    actualCharacters,
  } = {}) {
    super("GPT API response exceeded the maximum safe payload budget.");
    this.name = "GptApiResponseBudgetError";
    this.actualCharacters = actualCharacters;
    this.maxCharacters = maxCharacters;
    this.statusCode = 503;
  }
}

export class GptApiTimeoutError extends Error {
  constructor({ timeoutMs = GPT_API_ROUTE_TIMEOUT_MS } = {}) {
    super("GPT API request exceeded the maximum safe execution time.");
    this.name = "GptApiTimeoutError";
    this.statusCode = 503;
    this.timeoutMs = timeoutMs;
  }
}

export function buildGptApiJsonResponse(
  body,
  {
    headers = {},
    maxCharacters = GPT_API_MAX_RESPONSE_CHARACTERS,
    status = 200,
  } = {},
) {
  const serializedBody = JSON.stringify(body);

  if (serializedBody.length > maxCharacters) {
    throw new GptApiResponseBudgetError({
      actualCharacters: serializedBody.length,
      maxCharacters,
    });
  }

  return NextResponse.json(body, {
    headers: {
      ...GPT_API_JSON_HEADERS,
      ...headers,
    },
    status,
  });
}

export function buildGptApiRateLimitErrorResponse(error) {
  return buildGptApiJsonResponse(
    {
      error: "rate_limited",
      retryAfterSeconds: error.retryAfterSeconds,
    },
    {
      headers: {
        "Retry-After": String(error.retryAfterSeconds),
      },
      status: error.statusCode || 429,
    },
  );
}

export function buildGptApiTemporaryUnavailableResponse() {
  return buildGptApiJsonResponse(
    {
      error: "temporarily_unavailable",
    },
    {
      status: 503,
    },
  );
}

export function buildGptApiInternalErrorResponse() {
  return buildGptApiJsonResponse(
    {
      error: "internal_server_error",
    },
    {
      status: 500,
    },
  );
}

export async function runWithGptApiDeadline(
  operation,
  { timeoutMs = GPT_API_ROUTE_TIMEOUT_MS } = {},
) {
  let timerId;

  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timerId = setTimeout(() => {
          reject(
            new GptApiTimeoutError({
              timeoutMs,
            }),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timerId);
  }
}
