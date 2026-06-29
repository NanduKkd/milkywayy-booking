import { NextResponse } from "next/server";
import { Op } from "sequelize";
import models from "@/lib/db/models";
import { parseBookingReferenceToId } from "@/lib/helpers/invoice-format";
import {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  GptApiAuthorizationError,
} from "../../_lib/auth";
import { serializeBookingDto } from "../../_lib/dtos";

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
  return NextResponse.json(
    {
      error: "not_found",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 404,
    },
  );
}

export async function GET(request, context) {
  try {
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

    return NextResponse.json(serializeBookingDto(booking), {
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
