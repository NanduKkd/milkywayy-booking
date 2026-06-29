import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  GPT_API_AUTH_ERROR_CODES,
  GptApiAuthorizationError,
  GptApiRateLimitError,
} from "../_lib/auth";
import { serializeConnectedAccountDto } from "../_lib/dtos";
import {
  buildGptApiInternalErrorResponse,
  buildGptApiJsonResponse,
  buildGptApiRateLimitErrorResponse,
  buildGptApiTemporaryUnavailableResponse,
  GptApiResponseBudgetError,
  GptApiTimeoutError,
  runWithGptApiDeadline,
} from "../_lib/runtime";

const CUSTOMER_READ_SCOPE = "customer:read";

async function loadConnectedCustomer(customerId) {
  return models.User.findByPk(customerId, {
    attributes: [
      "id",
      "accountType",
      "companyName",
      "fullName",
      "phone",
      "role",
    ],
  });
}

function buildUnavailablePrincipalError() {
  return new GptApiAuthorizationError({
    code: GPT_API_AUTH_ERROR_CODES.invalidToken,
    description: "Bearer token is invalid.",
    reasonCode: "access_token_principal_unavailable",
    statusCode: 401,
  });
}

export async function GET(request) {
  try {
    return await runWithGptApiDeadline(async () => {
      const principal = await authenticateGptApiRequest(request, {
        requiredScopes: [CUSTOMER_READ_SCOPE],
      });
      const customer = await loadConnectedCustomer(principal.customerId);

      if (!customer || customer.role !== USER_ROLES.CUSTOMER) {
        throw buildUnavailablePrincipalError();
      }

      return buildGptApiJsonResponse(serializeConnectedAccountDto(customer));
    });
  } catch (error) {
    if (error instanceof GptApiAuthorizationError) {
      return buildGptApiAuthorizationErrorResponse(error);
    }

    if (error instanceof GptApiRateLimitError) {
      return buildGptApiRateLimitErrorResponse(error);
    }

    if (
      error instanceof GptApiResponseBudgetError ||
      error instanceof GptApiTimeoutError
    ) {
      console.error(
        "GPT API /me request exceeded runtime safety budget:",
        error,
      );
      return buildGptApiTemporaryUnavailableResponse();
    }

    console.error("GPT API /me request failed:", error);
    return buildGptApiInternalErrorResponse();
  }
}
