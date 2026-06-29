import { NextResponse } from "next/server";
import { Op } from "sequelize";
import models from "@/lib/db/models";
import { parseBookingReferenceToId } from "@/lib/helpers/invoice-format";
import {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  GptApiAuthorizationError,
} from "../_lib/auth";
import {
  buildBookingsListResponse,
  buildSequelizeCursorPagination,
  GptApiDtoValidationError,
  parseBookingsListQuery,
} from "../_lib/dtos";

const CUSTOMER_READ_SCOPE = "customer:read";
const BOOKING_LIST_ATTRIBUTES = [
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

function buildBookingListWhere(query, customerId) {
  const conditions = [{ userId: customerId }];
  const cursorPagination = buildSequelizeCursorPagination(query.cursor);

  if (query.bookingCode) {
    conditions.push(buildBookingIdentifierWhere(query.bookingCode));
  }

  if (query.scheduledFrom || query.scheduledTo) {
    const dateFilters = {};

    if (query.scheduledFrom) {
      dateFilters[Op.gte] = query.scheduledFrom;
    }

    if (query.scheduledTo) {
      dateFilters[Op.lte] = query.scheduledTo;
    }

    conditions.push({
      date: dateFilters,
    });
  }

  if (query.status) {
    conditions.push({
      status: query.status,
    });
  }

  if (query.workflowStatus) {
    conditions.push({
      workflowStatus: query.workflowStatus,
    });
  }

  if (Object.keys(cursorPagination.where).length > 0) {
    conditions.push(cursorPagination.where);
  }

  return {
    order: cursorPagination.order,
    where: conditions.length === 1 ? conditions[0] : { [Op.and]: conditions },
  };
}

function getBookingCursorValue(booking) {
  return {
    id: Number(booking.id),
    sortValue: new Date(booking.createdAt).toISOString(),
  };
}

export async function GET(request) {
  try {
    const principal = await authenticateGptApiRequest(request, {
      requiredScopes: [CUSTOMER_READ_SCOPE],
    });
    const query = parseBookingsListQuery(new URL(request.url).searchParams);
    const bookingQuery = buildBookingListWhere(query, principal.customerId);
    const bookings = await models.Booking.findAll({
      attributes: BOOKING_LIST_ATTRIBUTES,
      limit: query.limit + 1,
      order: bookingQuery.order,
      where: bookingQuery.where,
    });

    return NextResponse.json(
      buildBookingsListResponse(bookings, query.limit, getBookingCursorValue),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof GptApiAuthorizationError) {
      return buildGptApiAuthorizationErrorResponse(error);
    }

    if (error instanceof GptApiDtoValidationError) {
      return NextResponse.json(
        {
          details: error.issues,
          error: "invalid_request",
        },
        {
          status: 422,
        },
      );
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
