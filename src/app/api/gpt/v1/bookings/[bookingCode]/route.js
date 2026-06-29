import { Op } from "sequelize";
import models from "@/lib/db/models";
import { parseBookingReferenceToId } from "@/lib/helpers/invoice-format";
import { logSecurityError } from "@/lib/logging/security";
import {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  GptApiAuthorizationError,
  GptApiRateLimitError,
} from "../../_lib/auth";
import { serializeBookingDto } from "../../_lib/dtos";
import {
  buildGptApiInternalErrorResponse,
  buildGptApiJsonResponse,
  buildGptApiRateLimitErrorResponse,
  buildGptApiTemporaryUnavailableResponse,
  GptApiResponseBudgetError,
  GptApiTimeoutError,
  runWithGptApiDeadline,
} from "../../_lib/runtime";

const CUSTOMER_READ_SCOPE = "customer:read";
const BOOKING_DETAIL_ATTRIBUTES = [
  "id",
  "bookingCode",
  "status",
  "workflowStatus",
  "shootDetails",
  "propertyDetails",
  "date",
  "startTime",
  "total",
  "createdAt",
];

function buildBookingIdentifierWhere(bookingCode) {
  const legacyBookingId = parseBookingReferenceToId(bookingCode);

  if (
    !legacyBookingId &&
    !/^MWB-\d{4,}$/u.test(String(bookingCode || "").trim())
  ) {
    return null;
  }

  const conditions = [{ bookingCode }];

  if (legacyBookingId) {
    conditions.push({
      bookingCode: null,
      id: legacyBookingId,
    });
  }

  return {
    [Op.or]: conditions,
  };
}

function buildNotFoundResponse() {
  return buildGptApiJsonResponse(
    {
      error: "not_found",
    },
    {
      status: 404,
    },
  );
}

export async function GET(request, context) {
  try {
    return await runWithGptApiDeadline(async () => {
      const principal = await authenticateGptApiRequest(request, {
        requiredScopes: [CUSTOMER_READ_SCOPE],
      });
      const params = await context.params;
      const bookingCode = String(params?.bookingCode || "").trim();
      const bookingIdentifierWhere = buildBookingIdentifierWhere(bookingCode);

      if (!bookingIdentifierWhere) {
        return buildNotFoundResponse();
      }

      const booking = await models.Booking.findOne({
        attributes: BOOKING_DETAIL_ATTRIBUTES,
        where: {
          [Op.and]: [{ userId: principal.customerId }, bookingIdentifierWhere],
        },
      });

      if (!booking) {
        return buildNotFoundResponse();
      }

      return buildGptApiJsonResponse(serializeBookingDto(booking));
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
      logSecurityError(
        "GPT API booking detail request exceeded runtime safety budget.",
        error,
        {
          route: "/api/gpt/v1/bookings/[bookingCode]",
        },
      );
      return buildGptApiTemporaryUnavailableResponse();
    }

    logSecurityError("GPT API booking detail request failed.", error, {
      route: "/api/gpt/v1/bookings/[bookingCode]",
    });
    return buildGptApiInternalErrorResponse();
  }
}
