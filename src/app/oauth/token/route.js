import {
  authenticateOAuthClient,
  OAuthClientAuthenticationError,
} from "@/lib/oauth/clientAuthentication";
import {
  exchangeAuthorizationCode,
  OAuthTokenExchangeError,
} from "@/lib/oauth/tokenExchange";
import { RateLimitExceededError } from "@/lib/services/oauthRateLimits";

const TOKEN_RESPONSE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  Pragma: "no-cache",
});

function buildJsonResponse(body, { headers = {}, status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...TOKEN_RESPONSE_HEADERS,
      ...headers,
    },
    status,
  });
}

function buildOAuthErrorResponse(error, { headers = {}, status = 400 } = {}) {
  return buildJsonResponse(
    {
      error,
    },
    {
      headers,
      status,
    },
  );
}

function isFormUrlEncodedRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType
    .toLowerCase()
    .startsWith("application/x-www-form-urlencoded");
}

export async function POST(request) {
  if (!isFormUrlEncodedRequest(request)) {
    return buildOAuthErrorResponse("invalid_request", { status: 400 });
  }

  const body = new URLSearchParams(await request.text());

  try {
    const { client } = await authenticateOAuthClient({
      body,
      headers: request.headers,
    });
    const tokenResponse = await exchangeAuthorizationCode({
      client,
      parameters: body,
    });

    return buildJsonResponse(tokenResponse);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return buildOAuthErrorResponse("temporarily_unavailable", {
        headers: {
          "Retry-After": String(error.retryAfterSeconds),
        },
        status: 429,
      });
    }

    if (error instanceof OAuthClientAuthenticationError) {
      return buildOAuthErrorResponse(error.code, {
        headers: error.headers,
        status: error.statusCode,
      });
    }

    if (error instanceof OAuthTokenExchangeError) {
      return buildOAuthErrorResponse(error.code, {
        status: error.statusCode,
      });
    }

    console.error("OAuth token exchange failed:", error);

    return buildOAuthErrorResponse("temporarily_unavailable", { status: 503 });
  }
}
