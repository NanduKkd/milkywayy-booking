import { Op } from "sequelize";
import { z } from "zod";
import { USER_ROLES } from "@/lib/config/app.config";
import User from "@/lib/db/models/user";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { bookingSchema } from "@/lib/schema/booking.schema";
import { adminBookingNewCustomerSchema } from "@/lib/services/adminBookingCustomerValidation";
import {
  assertBookingPropertiesAvailable,
  buildPreparedPropertySummary,
} from "@/lib/services/bookingPreparation";

const EXISTING_CUSTOMER_LIMIT = 8;

const previewPreparationSchema = z.discriminatedUnion("customerMode", [
  z.object({
    customerMode: z.literal("existing"),
    customerId: z.coerce.number().int().positive("Customer is required"),
    properties: bookingSchema.shape.properties,
  }),
  z.object({
    customerMode: z.literal("new"),
    customer: adminBookingNewCustomerSchema,
    properties: bookingSchema.shape.properties,
  }),
]);

function assertAuthorizedActor(actorUser) {
  if (!actorUser?.id) {
    throw new Error("Unauthorized");
  }

  if (actorUser.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Scheduling calendar admin access required");
  }

  return {
    id: Number(actorUser.id),
    role: actorUser.role,
  };
}

function toDisplayName(customer) {
  if (!customer) return "";

  if (customer.accountType === "COMPANY") {
    return customer.companyName || customer.fullName || customer.email || "";
  }

  return customer.fullName || customer.email || customer.phone || "";
}

function buildCustomerSnapshot(customer) {
  if (!customer) return null;

  return {
    id: customer.id ?? null,
    accountType: customer.accountType || "INDIVIDUAL",
    fullName: customer.fullName || null,
    companyName: customer.companyName || null,
    billingAddress: customer.billingAddress || null,
    trn: customer.trn || null,
    email: customer.email || null,
    phone: customer.phone || null,
    displayName: toDisplayName(customer),
  };
}

function buildServiceLabel(property) {
  const services = Array.isArray(property.services)
    ? [...property.services]
    : [];
  if (!services.includes("Videography")) {
    return services.join(", ");
  }

  const subSelections = String(property.videographySubService || "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  if (subSelections.length === 0) {
    return services.join(", ");
  }

  return services
    .map((service) =>
      service === "Videography"
        ? `Videography (${subSelections.join(", ")})`
        : service,
    )
    .join(", ");
}

function buildPreparedPropertyResponse(
  property,
  pricingConfig,
  timeSlotConfig,
) {
  const summary = buildPreparedPropertySummary(
    property,
    pricingConfig,
    timeSlotConfig,
  );

  return {
    ...summary,
    label: [summary.propertySize, summary.propertyType]
      .filter(Boolean)
      .join(" "),
    locationLabel: [summary.unitNumber, summary.building, summary.community]
      .filter(Boolean)
      .join(", "),
    serviceLabel: buildServiceLabel(summary),
  };
}

export async function searchAdminBookingPreparationCustomers({
  actorUser,
  query,
  limit = EXISTING_CUSTOMER_LIMIT,
  transaction = null,
} = {}) {
  assertAuthorizedActor(actorUser);

  const normalizedQuery = String(query ?? "").trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  const normalizedLimit = Math.min(
    Math.max(Number(limit) || EXISTING_CUSTOMER_LIMIT, 1),
    20,
  );
  const likeQuery = `%${normalizedQuery}%`;
  const searchConditions = [
    { fullName: { [Op.iLike]: likeQuery } },
    { companyName: { [Op.iLike]: likeQuery } },
    { email: { [Op.iLike]: likeQuery } },
    { phone: { [Op.iLike]: likeQuery } },
  ];
  const numericQuery = Number(normalizedQuery);

  if (Number.isInteger(numericQuery) && numericQuery > 0) {
    searchConditions.unshift({ id: numericQuery });
  }

  const customers = await User.findAll({
    attributes: [
      "id",
      "accountType",
      "fullName",
      "companyName",
      "billingAddress",
      "trn",
      "email",
      "phone",
      "updatedAt",
    ],
    where: {
      role: USER_ROLES.CUSTOMER,
      [Op.or]: searchConditions,
    },
    order: [
      ["updatedAt", "DESC"],
      ["id", "DESC"],
    ],
    limit: normalizedLimit,
    transaction,
  });

  return customers
    .map((customer) => buildCustomerSnapshot(customer))
    .filter(Boolean);
}

export async function previewAdminBookingPreparation({
  actorUser,
  input,
  excludeBookingIds = [],
  transaction = null,
} = {}) {
  assertAuthorizedActor(actorUser);

  const normalizedInput = previewPreparationSchema.parse(input || {});
  const pricingConfig = await getPricingConfig();
  const { timeSlotConfig } = await assertBookingPropertiesAvailable(
    normalizedInput.properties,
    excludeBookingIds,
    { transaction },
  );

  const properties = normalizedInput.properties.map((property, index) => {
    const prepared = buildPreparedPropertyResponse(
      property,
      pricingConfig,
      timeSlotConfig,
    );

    if (prepared.total <= 0) {
      throw new Error(
        `Property ${index + 1} does not have a configured price for the selected services.`,
      );
    }

    return prepared;
  });

  const customer =
    normalizedInput.customerMode === "existing"
      ? await User.findOne({
          attributes: [
            "id",
            "accountType",
            "fullName",
            "companyName",
            "billingAddress",
            "trn",
            "email",
            "phone",
          ],
          where: {
            id: normalizedInput.customerId,
            role: USER_ROLES.CUSTOMER,
          },
          transaction,
        })
      : normalizedInput.customer;

  if (!customer) {
    throw new Error("Customer not found");
  }

  const totalAmount = properties.reduce(
    (sum, property) => sum + Number(property.total || 0),
    0,
  );

  return {
    customerMode: normalizedInput.customerMode,
    customer: buildCustomerSnapshot(customer),
    requiresRegistration: normalizedInput.customerMode === "new",
    properties,
    totalAmount,
  };
}

export function isAdminBookingPreparationValidationError(error) {
  return error instanceof z.ZodError;
}
