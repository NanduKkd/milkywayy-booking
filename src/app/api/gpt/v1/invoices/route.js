import { NextResponse } from "next/server";
import { Op } from "sequelize";
import models from "@/lib/db/models";
import "@/lib/db/relations";
import {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  GptApiAuthorizationError,
} from "../_lib/auth";
import {
  buildInvoicesListResponse,
  buildSequelizeCursorPagination,
  GptApiDtoValidationError,
  parseInvoicesListQuery,
} from "../_lib/dtos";

const CUSTOMER_READ_SCOPE = "customer:read";
const INVOICE_LIST_ATTRIBUTES = [
  "id",
  "amount",
  "status",
  "invoiceNumber",
  "paidAt",
  "createdAt",
];
const INVOICE_BOOKING_ATTRIBUTES = ["id", "bookingCode"];

function parseLegacyInvoiceNumberToId(invoiceNumber) {
  const normalized = String(invoiceNumber || "").trim();

  if (!/^INV-\d{6}$/u.test(normalized)) {
    return null;
  }

  const invoiceId = Number(normalized.slice("INV-".length));
  return Number.isInteger(invoiceId) && invoiceId > 0 ? invoiceId : null;
}

function buildInvoiceIdentifierWhere(invoiceNumber) {
  const legacyInvoiceId = parseLegacyInvoiceNumberToId(invoiceNumber);
  const conditions = [{ invoiceNumber }];

  if (legacyInvoiceId) {
    conditions.push({
      id: legacyInvoiceId,
      invoiceNumber: null,
    });
  }

  return {
    [Op.or]: conditions,
  };
}

function buildInvoiceListWhere(query, customerId) {
  const conditions = [
    {
      userId: customerId,
    },
  ];
  const cursorPagination = buildSequelizeCursorPagination(query.cursor);

  if (query.invoiceNumber) {
    conditions.push(buildInvoiceIdentifierWhere(query.invoiceNumber));
  }

  if (query.paidFrom || query.paidTo) {
    const paidAtFilters = {};

    if (query.paidFrom) {
      paidAtFilters[Op.gte] = `${query.paidFrom}T00:00:00.000Z`;
    }

    if (query.paidTo) {
      paidAtFilters[Op.lte] = `${query.paidTo}T23:59:59.999Z`;
    }

    conditions.push({
      paidAt: paidAtFilters,
    });
  }

  if (query.status) {
    conditions.push({
      status: query.status,
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

function getInvoiceCursorValue(invoice) {
  return {
    id: Number(invoice.id),
    sortValue: new Date(invoice.createdAt).toISOString(),
  };
}

export async function GET(request) {
  try {
    const principal = await authenticateGptApiRequest(request, {
      requiredScopes: [CUSTOMER_READ_SCOPE],
    });
    const query = parseInvoicesListQuery(new URL(request.url).searchParams);
    const invoiceQuery = buildInvoiceListWhere(query, principal.customerId);
    const invoices = await models.Transaction.findAll({
      attributes: INVOICE_LIST_ATTRIBUTES,
      include: [
        {
          attributes: INVOICE_BOOKING_ATTRIBUTES,
          as: "bookings",
          model: models.Booking,
        },
      ],
      limit: query.limit + 1,
      order: invoiceQuery.order,
      where: invoiceQuery.where,
    });

    return NextResponse.json(
      buildInvoicesListResponse(invoices, query.limit, getInvoiceCursorValue),
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
