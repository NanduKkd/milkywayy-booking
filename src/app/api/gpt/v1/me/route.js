import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  GPT_API_AUTH_ERROR_CODES,
  GptApiAuthorizationError,
} from "../_lib/auth";
import { serializeConnectedAccountDto } from "../_lib/dtos";

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
    const principal = await authenticateGptApiRequest(request, {
      requiredScopes: [CUSTOMER_READ_SCOPE],
    });
    const customer = await loadConnectedCustomer(principal.customerId);

    if (!customer || customer.role !== USER_ROLES.CUSTOMER) {
      throw buildUnavailablePrincipalError();
    }

    return NextResponse.json(serializeConnectedAccountDto(customer), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof GptApiAuthorizationError) {
      return buildGptApiAuthorizationErrorResponse(error);
    }

    return NextResponse.json(
      {
        error: "internal_server_error",
      },
      {
        status: 500,
      },
    );
  }
}
