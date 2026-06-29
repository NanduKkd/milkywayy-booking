import { Op } from "sequelize";
import models from "@/lib/db/models";
import "@/lib/db/relations";
import {
  DELIVERY_FILE_STATUS,
  isCustomerDeliveryFileVisible,
} from "@/lib/helpers/bookingWorkflow";
import { parseBookingReferenceToId } from "@/lib/helpers/invoice-format";
import { logSecurityError } from "@/lib/logging/security";
import {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  GptApiAuthorizationError,
  GptApiRateLimitError,
} from "../_lib/auth";
import {
  buildDeliveryFilesListResponse,
  buildSequelizeCursorPagination,
  GptApiDtoValidationError,
  parseFilesListQuery,
} from "../_lib/dtos";
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
const DELIVERY_FILE_ATTRIBUTES = [
  "id",
  "label",
  "type",
  "status",
  "revisionCount",
  "reviewDeadlineAt",
  "createdAt",
];
const DELIVERY_FILE_BOOKING_ATTRIBUTES = ["id", "bookingCode"];
const DELIVERY_FILE_VERSION_ATTRIBUTES = [
  "id",
  "originalFilename",
  "mimeType",
  "sizeBytes",
  "uploadedAt",
];
const VISIBLE_DELIVERY_FILE_STATUSES = Object.freeze(
  Object.values(DELIVERY_FILE_STATUS).filter((status) =>
    isCustomerDeliveryFileVisible({
      deletedAt: null,
      status,
    }),
  ),
);

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

function buildFilesListQuery(query, customerId) {
  const cursorPagination = buildSequelizeCursorPagination(query.cursor);
  const deliveryFileConditions = [
    {
      status: {
        [Op.in]: VISIBLE_DELIVERY_FILE_STATUSES,
      },
    },
  ];
  const bookingConditions = [{ userId: customerId }];
  const currentVersionConditions = [];

  if (query.fileId) {
    deliveryFileConditions.push({
      id: query.fileId,
    });
  }

  if (query.status) {
    deliveryFileConditions.push({
      status: query.status,
    });
  }

  if (query.type) {
    deliveryFileConditions.push({
      type: query.type,
    });
  }

  if (query.bookingCode) {
    bookingConditions.push(buildBookingIdentifierWhere(query.bookingCode));
  }

  if (query.uploadedFrom || query.uploadedTo) {
    const uploadedAtFilters = {};

    if (query.uploadedFrom) {
      uploadedAtFilters[Op.gte] = `${query.uploadedFrom}T00:00:00.000Z`;
    }

    if (query.uploadedTo) {
      uploadedAtFilters[Op.lte] = `${query.uploadedTo}T23:59:59.999Z`;
    }

    currentVersionConditions.push({
      uploadedAt: uploadedAtFilters,
    });
  }

  if (Object.keys(cursorPagination.where).length > 0) {
    deliveryFileConditions.push(cursorPagination.where);
  }

  return {
    bookingWhere:
      bookingConditions.length === 1
        ? bookingConditions[0]
        : { [Op.and]: bookingConditions },
    currentVersionWhere:
      currentVersionConditions.length === 0
        ? undefined
        : currentVersionConditions.length === 1
          ? currentVersionConditions[0]
          : { [Op.and]: currentVersionConditions },
    order: cursorPagination.order,
    where:
      deliveryFileConditions.length === 1
        ? deliveryFileConditions[0]
        : { [Op.and]: deliveryFileConditions },
  };
}

function getDeliveryFileCursorValue(file) {
  return {
    id: Number(file.id),
    sortValue: new Date(file.createdAt).toISOString(),
  };
}

export async function GET(request) {
  try {
    return await runWithGptApiDeadline(async () => {
      const principal = await authenticateGptApiRequest(request, {
        requiredScopes: [CUSTOMER_READ_SCOPE],
      });
      const query = parseFilesListQuery(new URL(request.url).searchParams);
      const fileQuery = buildFilesListQuery(query, principal.customerId);
      const files = await models.BookingDeliveryFile.findAll({
        attributes: DELIVERY_FILE_ATTRIBUTES,
        include: [
          {
            attributes: DELIVERY_FILE_BOOKING_ATTRIBUTES,
            as: "booking",
            model: models.Booking,
            required: true,
            where: fileQuery.bookingWhere,
          },
          {
            attributes: DELIVERY_FILE_VERSION_ATTRIBUTES,
            as: "currentVersion",
            model: models.BookingDeliveryFileVersion,
            required: true,
            where: fileQuery.currentVersionWhere,
          },
        ],
        limit: query.limit + 1,
        order: fileQuery.order,
        where: fileQuery.where,
      });

      return buildGptApiJsonResponse(
        buildDeliveryFilesListResponse(
          files,
          query.limit,
          getDeliveryFileCursorValue,
        ),
      );
    });
  } catch (error) {
    if (error instanceof GptApiAuthorizationError) {
      return buildGptApiAuthorizationErrorResponse(error);
    }

    if (error instanceof GptApiRateLimitError) {
      return buildGptApiRateLimitErrorResponse(error);
    }

    if (error instanceof GptApiDtoValidationError) {
      return buildGptApiJsonResponse(
        {
          details: error.issues,
          error: "invalid_request",
        },
        {
          status: 422,
        },
      );
    }

    if (
      error instanceof GptApiResponseBudgetError ||
      error instanceof GptApiTimeoutError
    ) {
      logSecurityError(
        "GPT API delivery files list request exceeded runtime safety budget.",
        error,
        {
          route: "/api/gpt/v1/files",
        },
      );
      return buildGptApiTemporaryUnavailableResponse();
    }

    logSecurityError("GPT API delivery files list request failed.", error, {
      route: "/api/gpt/v1/files",
    });
    return buildGptApiInternalErrorResponse();
  }
}
