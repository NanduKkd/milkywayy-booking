import { isDeepStrictEqual } from "node:util";
import {
  col,
  fn,
  Op,
  where as sequelizeWhere,
  UniqueConstraintError,
} from "sequelize";
import { USER_ROLES } from "@/lib/config/app.config";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";

const PROMOTION_KINDS = new Set(["GENERIC", "PERSONAL", "AUTOMATIC"]);
const BENEFIT_TYPES = new Set(["FIXED", "PERCENTAGE"]);
const PROMOTION_STATUSES = new Set([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "DEACTIVATED",
]);
const CREATEABLE_PROMOTION_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED"]);
const TRIGGER_TYPES = new Set([
  "NONE",
  "FIRST_PAID_BOOKING",
  "SECOND_PAID_BOOKING",
  "ANY_PAID_BOOKING",
  "DATE_RANGE",
]);
const DEFAULT_ASSIGNABLE_CUSTOMER_LIMIT = 8;
const ACTIVE_GENERIC_CODE_CONFLICT_MESSAGE =
  "An active generic promotion already uses that code";
const DUPLICATE_ACTIVE_ASSIGNMENT_MESSAGE =
  "Customer already has an active promotion assignment";
const ACTIVE_GENERIC_CODE_CONSTRAINT = "promotions_active_generic_code_unique";
const ACTIVE_ASSIGNMENT_CONSTRAINT =
  "promotion_assignments_active_promotion_user_unique";
const PROMOTION_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))?)?$/;

export const PROMOTION_ADMIN_AUTHORIZATION_MODE = "SUPERADMIN_COMPAT";

function runInTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

function normalizeRequiredId(value, label) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function normalizeRequiredString(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function normalizeOptionalText(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function normalizeBoolean(value, defaultValue = false) {
  if (value == null) {
    return defaultValue;
  }

  if (typeof value !== "boolean") {
    throw new Error("Boolean fields must be true or false");
  }

  return value;
}

function normalizeNonNegativeInteger(value, label, defaultValue = 0) {
  if (value == null || value === "") {
    return defaultValue;
  }

  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }

  return normalized;
}

function normalizeOptionalPositiveInteger(value, label) {
  if (value == null || value === "") {
    return null;
  }

  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return normalized;
}

function normalizePositiveAmount(value, label) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`${label} must be a positive number`);
  }

  return normalized;
}

function normalizeNonNegativeAmount(value, label, defaultValue = 0) {
  if (value == null || value === "") {
    return defaultValue;
  }

  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }

  return normalized;
}

function normalizeOptionalPositiveAmount(value, label) {
  if (value == null || value === "") {
    return null;
  }

  return normalizePositiveAmount(value, label);
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year, month) {
  const days = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return days[month - 1] || 0;
}

function parsePromotionDate(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must use YYYY-MM-DD or an ISO 8601 date-time`);
  }

  const match = value.match(PROMOTION_DATE_PATTERN);

  if (!match) {
    throw new Error(`${label} must use YYYY-MM-DD or an ISO 8601 date-time`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const millisecond = Number((match[7] || "").padEnd(3, "0") || 0);
  const offsetSign = match[9] || null;
  const offsetHour = Number(match[10] || 0);
  const offsetMinute = Number(match[11] || 0);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > getDaysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    throw new Error(`${label} must be a valid date`);
  }

  const normalized = new Date(0);
  normalized.setUTCFullYear(year, month - 1, day);
  normalized.setUTCHours(hour, minute, second, millisecond);

  if (offsetSign) {
    const offsetMilliseconds = (offsetHour * 60 + offsetMinute) * 60 * 1000;
    normalized.setTime(
      normalized.getTime() +
        (offsetSign === "+" ? -offsetMilliseconds : offsetMilliseconds),
    );
  }

  return normalized;
}

function normalizeOptionalDate(value, label) {
  if (value == null || value === "") {
    return null;
  }

  return parsePromotionDate(value, label);
}

function normalizePromotionCode(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return normalized || null;
}

function normalizePromotionKind(value) {
  const normalized = normalizeRequiredString(
    value,
    "Promotion kind",
  ).toUpperCase();

  if (!PROMOTION_KINDS.has(normalized)) {
    throw new Error("Promotion kind must be GENERIC, PERSONAL, or AUTOMATIC");
  }

  return normalized;
}

function normalizeBenefitType(value) {
  const normalized = normalizeRequiredString(
    value,
    "Benefit type",
  ).toUpperCase();

  if (!BENEFIT_TYPES.has(normalized)) {
    throw new Error("Benefit type must be FIXED or PERCENTAGE");
  }

  return normalized;
}

function normalizeTriggerType(value) {
  const normalized = normalizeRequiredString(
    value,
    "Trigger type",
  ).toUpperCase();

  if (!TRIGGER_TYPES.has(normalized)) {
    throw new Error(
      "Trigger type must be NONE, FIRST_PAID_BOOKING, SECOND_PAID_BOOKING, ANY_PAID_BOOKING, or DATE_RANGE",
    );
  }

  return normalized;
}

function normalizeStatus(value, { allowDeactivated = true } = {}) {
  const normalized = normalizeRequiredString(
    value,
    "Promotion status",
  ).toUpperCase();

  if (!PROMOTION_STATUSES.has(normalized)) {
    throw new Error(
      "Promotion status must be DRAFT, ACTIVE, PAUSED, or DEACTIVATED",
    );
  }

  if (!allowDeactivated && normalized === "DEACTIVATED") {
    throw new Error("New promotions cannot start in DEACTIVATED status");
  }

  return normalized;
}

function assertAuthorizedPromotionActor(actorUser) {
  if (!actorUser?.id) {
    throw new Error("Unauthorized");
  }

  if (actorUser.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Promotion admin access required");
  }

  return {
    id: normalizeRequiredId(actorUser.id, "Actor user ID"),
    role: actorUser.role,
  };
}

function normalizeDateRangeTriggerConfig(triggerConfig) {
  if (
    !triggerConfig ||
    typeof triggerConfig !== "object" ||
    Array.isArray(triggerConfig)
  ) {
    throw new Error("Date-range trigger config must be an object");
  }

  const startDate = normalizeRequiredString(
    triggerConfig.startDate,
    "Date-range start date",
  );
  const endDate = normalizeRequiredString(
    triggerConfig.endDate,
    "Date-range end date",
  );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error("Date-range start date must use YYYY-MM-DD");
  }

  parsePromotionDate(startDate, "Date-range start date");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Date-range end date must use YYYY-MM-DD");
  }

  parsePromotionDate(endDate, "Date-range end date");

  if (endDate < startDate) {
    throw new Error("Date-range end date must be on or after start date");
  }

  return {
    startDate,
    endDate,
    includeStart: normalizeBoolean(triggerConfig.includeStart, true),
    includeEnd: normalizeBoolean(triggerConfig.includeEnd, true),
  };
}

function normalizeTriggerConfig(triggerType, triggerConfig) {
  if (triggerType === "DATE_RANGE") {
    return normalizeDateRangeTriggerConfig(triggerConfig);
  }

  if (
    triggerConfig != null &&
    (typeof triggerConfig !== "object" || Array.isArray(triggerConfig))
  ) {
    throw new Error("Trigger config must be an object");
  }

  return {};
}

function normalizePromotionPayload(input, { existingPromotion = null } = {}) {
  const kind = normalizePromotionKind(input.kind);
  const benefitType = normalizeBenefitType(input.benefitType);
  const triggerType = normalizeTriggerType(
    input.triggerType ?? existingPromotion?.triggerType ?? "NONE",
  );
  const status = normalizeStatus(
    input.status ?? existingPromotion?.status ?? "DRAFT",
    { allowDeactivated: existingPromotion != null },
  );
  const code = normalizePromotionCode(input.code);
  const benefitValue = normalizePositiveAmount(
    input.benefitValue,
    "Benefit value",
  );
  const benefitCap = normalizeOptionalPositiveAmount(
    input.benefitCap,
    "Benefit cap",
  );
  const minimumSpend = normalizeNonNegativeAmount(
    input.minimumSpend,
    "Minimum spend",
  );
  const startsAt = normalizeOptionalDate(input.startsAt, "Start date");
  const endsAt = normalizeOptionalDate(input.endsAt, "End date");
  const priority = normalizeNonNegativeInteger(input.priority, "Priority");
  const perUserLimit = normalizeOptionalPositiveInteger(
    input.perUserLimit,
    "Per-user limit",
  );
  const totalLimit = normalizeOptionalPositiveInteger(
    input.totalLimit,
    "Total limit",
  );

  if (kind === "GENERIC" && !code) {
    throw new Error("Generic promotions require a code");
  }

  if (kind !== "GENERIC" && code) {
    throw new Error("Only generic promotions may define a code");
  }

  if ((kind === "GENERIC" || kind === "PERSONAL") && triggerType !== "NONE") {
    throw new Error(
      "Generic and personal promotions must use trigger type NONE",
    );
  }

  if (kind === "AUTOMATIC" && triggerType === "NONE") {
    throw new Error("Automatic promotions require a non-NONE trigger type");
  }

  if (benefitType === "PERCENTAGE" && benefitValue > 100) {
    throw new Error("Percentage benefits cannot exceed 100");
  }

  if (benefitType === "FIXED" && benefitCap != null) {
    throw new Error("Fixed-amount promotions cannot define a benefit cap");
  }

  if (endsAt && startsAt && endsAt < startsAt) {
    throw new Error("End date must be on or after the start date");
  }

  return {
    kind,
    code,
    name: normalizeRequiredString(input.name, "Promotion name"),
    adminDescription: normalizeOptionalText(input.adminDescription),
    customerMessage: normalizeOptionalText(input.customerMessage),
    benefitType,
    benefitValue,
    benefitCap,
    minimumSpend,
    startsAt,
    endsAt,
    status,
    systemFlag: normalizeBoolean(input.systemFlag, false),
    priority,
    perUserLimit,
    totalLimit,
    triggerType,
    triggerConfig: normalizeTriggerConfig(triggerType, input.triggerConfig),
    legacySourceType: normalizeOptionalText(input.legacySourceType),
    legacySourceId: normalizeOptionalText(input.legacySourceId),
  };
}

function buildPromotionSnapshot(promotion) {
  if (!promotion) {
    return null;
  }

  const plain =
    typeof promotion.get === "function"
      ? promotion.get({ plain: true })
      : promotion;

  const assignments = Array.isArray(plain.assignments)
    ? plain.assignments
        .map((assignment) => buildPromotionAssignmentSnapshot(assignment))
        .filter(Boolean)
        .sort((left, right) => {
          const assignedAtDelta =
            new Date(right.assignedAt || 0).getTime() -
            new Date(left.assignedAt || 0).getTime();

          if (assignedAtDelta !== 0) {
            return assignedAtDelta;
          }

          return Number(right.id || 0) - Number(left.id || 0);
        })
    : [];

  return {
    id: plain.id ?? null,
    kind: plain.kind,
    code: plain.code || null,
    name: plain.name,
    adminDescription: plain.adminDescription || null,
    customerMessage: plain.customerMessage || null,
    benefitType: plain.benefitType,
    benefitValue:
      plain.benefitValue == null ? null : Number(plain.benefitValue),
    benefitCap: plain.benefitCap == null ? null : Number(plain.benefitCap),
    minimumSpend:
      plain.minimumSpend == null ? null : Number(plain.minimumSpend),
    startsAt: plain.startsAt ? new Date(plain.startsAt).toISOString() : null,
    endsAt: plain.endsAt ? new Date(plain.endsAt).toISOString() : null,
    status: plain.status,
    systemFlag: Boolean(plain.systemFlag),
    priority: Number(plain.priority || 0),
    perUserLimit:
      plain.perUserLimit == null ? null : Number(plain.perUserLimit),
    totalLimit: plain.totalLimit == null ? null : Number(plain.totalLimit),
    triggerType: plain.triggerType,
    triggerConfig: plain.triggerConfig || {},
    legacySourceType: plain.legacySourceType || null,
    legacySourceId: plain.legacySourceId || null,
    createdByUserId:
      plain.createdByUserId == null ? null : Number(plain.createdByUserId),
    updatedByUserId:
      plain.updatedByUserId == null ? null : Number(plain.updatedByUserId),
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : null,
    assignments,
  };
}

function buildCustomerSnapshot(user) {
  if (!user) {
    return null;
  }

  const plain =
    typeof user.get === "function" ? user.get({ plain: true }) : user;

  if (plain.role && plain.role !== USER_ROLES.CUSTOMER) {
    return null;
  }

  const displayName =
    plain.companyName ||
    plain.fullName ||
    plain.email ||
    plain.phone ||
    `Customer #${plain.id}`;

  return {
    id: plain.id == null ? null : Number(plain.id),
    accountType: plain.accountType || "INDIVIDUAL",
    companyName: plain.companyName || null,
    displayName,
    email: plain.email || null,
    fullName: plain.fullName || null,
    phone: plain.phone || null,
  };
}

function buildPromotionAssignmentSnapshot(assignment) {
  if (!assignment) {
    return null;
  }

  const plain =
    typeof assignment.get === "function"
      ? assignment.get({ plain: true })
      : assignment;
  const user = buildCustomerSnapshot(plain.user);

  if (!user) {
    return null;
  }

  return {
    id: plain.id == null ? null : Number(plain.id),
    promotionId: plain.promotionId == null ? null : Number(plain.promotionId),
    userId: plain.userId == null ? null : Number(plain.userId),
    assignedAt: plain.assignedAt
      ? new Date(plain.assignedAt).toISOString()
      : null,
    unassignedAt: plain.unassignedAt
      ? new Date(plain.unassignedAt).toISOString()
      : null,
    assignedByUserId:
      plain.assignedByUserId == null ? null : Number(plain.assignedByUserId),
    unassignedByUserId:
      plain.unassignedByUserId == null
        ? null
        : Number(plain.unassignedByUserId),
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : null,
    notes: plain.notes || null,
    user,
  };
}

function mergePromotionInput(existingPromotion, input) {
  const existing = buildPromotionSnapshot(existingPromotion);

  return {
    kind: input.kind ?? existing.kind,
    code: Object.hasOwn(input, "code") ? input.code : existing.code,
    name: input.name ?? existing.name,
    adminDescription: Object.hasOwn(input, "adminDescription")
      ? input.adminDescription
      : existing.adminDescription,
    customerMessage: Object.hasOwn(input, "customerMessage")
      ? input.customerMessage
      : existing.customerMessage,
    benefitType: input.benefitType ?? existing.benefitType,
    benefitValue: input.benefitValue ?? existing.benefitValue,
    benefitCap: Object.hasOwn(input, "benefitCap")
      ? input.benefitCap
      : existing.benefitCap,
    minimumSpend: Object.hasOwn(input, "minimumSpend")
      ? input.minimumSpend
      : existing.minimumSpend,
    startsAt: Object.hasOwn(input, "startsAt")
      ? input.startsAt
      : existing.startsAt,
    endsAt: Object.hasOwn(input, "endsAt") ? input.endsAt : existing.endsAt,
    status: existing.status,
    systemFlag: Object.hasOwn(input, "systemFlag")
      ? input.systemFlag
      : existing.systemFlag,
    priority: Object.hasOwn(input, "priority")
      ? input.priority
      : existing.priority,
    perUserLimit: Object.hasOwn(input, "perUserLimit")
      ? input.perUserLimit
      : existing.perUserLimit,
    totalLimit: Object.hasOwn(input, "totalLimit")
      ? input.totalLimit
      : existing.totalLimit,
    triggerType: input.triggerType ?? existing.triggerType,
    triggerConfig: Object.hasOwn(input, "triggerConfig")
      ? input.triggerConfig
      : existing.triggerConfig,
    legacySourceType: Object.hasOwn(input, "legacySourceType")
      ? input.legacySourceType
      : existing.legacySourceType,
    legacySourceId: Object.hasOwn(input, "legacySourceId")
      ? input.legacySourceId
      : existing.legacySourceId,
  };
}

function buildPromotionConfigurationSnapshot(promotion) {
  const snapshot = buildPromotionSnapshot(promotion);

  return {
    kind: snapshot.kind,
    code: snapshot.code,
    name: snapshot.name,
    adminDescription: snapshot.adminDescription,
    customerMessage: snapshot.customerMessage,
    benefitType: snapshot.benefitType,
    benefitValue: snapshot.benefitValue,
    benefitCap: snapshot.benefitCap,
    minimumSpend: snapshot.minimumSpend,
    startsAt: snapshot.startsAt,
    endsAt: snapshot.endsAt,
    status: snapshot.status,
    systemFlag: snapshot.systemFlag,
    priority: snapshot.priority,
    perUserLimit: snapshot.perUserLimit,
    totalLimit: snapshot.totalLimit,
    triggerType: snapshot.triggerType,
    triggerConfig: snapshot.triggerConfig,
    legacySourceType: snapshot.legacySourceType,
    legacySourceId: snapshot.legacySourceId,
  };
}

function hasMeaningfulPromotionChanges(beforeState, normalizedInput) {
  return !isDeepStrictEqual(
    buildPromotionConfigurationSnapshot(beforeState),
    buildPromotionConfigurationSnapshot(normalizedInput),
  );
}

function rethrowKnownUniqueConstraint(error, constraint, publicMessage) {
  const constraintNames = [
    error?.parent?.constraint,
    error?.original?.constraint,
  ];

  if (
    error instanceof UniqueConstraintError &&
    constraintNames.includes(constraint)
  ) {
    throw new Error(publicMessage);
  }

  throw error;
}

async function assertNoActiveGenericCodeConflict({
  code,
  excludePromotionId = null,
  transaction,
}) {
  if (!code) {
    return;
  }

  const conditions = [
    { kind: "GENERIC" },
    { status: "ACTIVE" },
    sequelizeWhere(fn("LOWER", col("code")), code.toLowerCase()),
  ];

  if (excludePromotionId != null) {
    conditions.push({ id: { [Op.ne]: excludePromotionId } });
  }

  const existingPromotion = await models.Promotion.findOne({
    where: {
      [Op.and]: conditions,
    },
    transaction,
  });

  if (existingPromotion) {
    throw new Error(ACTIVE_GENERIC_CODE_CONFLICT_MESSAGE);
  }
}

async function findPromotionForUpdate(promotionId, transaction) {
  const normalizedPromotionId = normalizeRequiredId(
    promotionId,
    "Promotion ID",
  );

  return models.Promotion.findByPk(normalizedPromotionId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

async function createPromotionAuditEvent({
  promotionId,
  promotionAssignmentId = null,
  actorUserId,
  action,
  beforeState,
  afterState,
  reason = null,
  metadata = {},
  transaction,
}) {
  await models.PromotionAuditEvent.create(
    {
      promotionId,
      promotionAssignmentId,
      actorUserId,
      action,
      beforeState,
      afterState,
      reason,
      metadata: {
        authorizationMode: PROMOTION_ADMIN_AUTHORIZATION_MODE,
        ...metadata,
      },
    },
    { transaction },
  );
}

function serializePromotionList(promotions) {
  return promotions.map((promotion) => buildPromotionSnapshot(promotion));
}

function buildPromotionAdminInclude() {
  return [
    {
      model: models.PromotionAssignment,
      as: "assignments",
      required: false,
      where: {
        unassignedAt: null,
      },
      include: [
        {
          model: models.User,
          as: "user",
          required: false,
          attributes: [
            "id",
            "fullName",
            "companyName",
            "email",
            "phone",
            "accountType",
            "role",
          ],
        },
      ],
    },
  ];
}

async function findPromotionForAdminView(promotionId, transaction) {
  const normalizedPromotionId = normalizeRequiredId(
    promotionId,
    "Promotion ID",
  );

  return models.Promotion.findByPk(normalizedPromotionId, {
    include: buildPromotionAdminInclude(),
    transaction,
  });
}

export async function listPromotions({
  actorUser,
  kind = null,
  status = null,
  transaction = null,
} = {}) {
  assertAuthorizedPromotionActor(actorUser);

  const where = {};

  if (kind != null) {
    where.kind = normalizePromotionKind(kind);
  }

  if (status != null) {
    where.status = normalizeStatus(status);
  }

  const promotions = await models.Promotion.findAll({
    where,
    include: buildPromotionAdminInclude(),
    order: [
      ["kind", "ASC"],
      ["priority", "DESC"],
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    transaction,
  });

  return serializePromotionList(promotions);
}

export async function searchAssignableCustomers({
  actorUser,
  query,
  limit = DEFAULT_ASSIGNABLE_CUSTOMER_LIMIT,
  transaction = null,
} = {}) {
  assertAuthorizedPromotionActor(actorUser);

  const normalizedQuery = String(query ?? "").trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const normalizedLimit = Math.min(
    normalizeOptionalPositiveInteger(limit, "Customer search limit") ||
      DEFAULT_ASSIGNABLE_CUSTOMER_LIMIT,
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

  const customers = await models.User.findAll({
    attributes: [
      "id",
      "fullName",
      "companyName",
      "email",
      "phone",
      "accountType",
      "role",
      "updatedAt",
    ],
    where: {
      role: USER_ROLES.CUSTOMER,
      disabledAt: null,
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

export async function createPromotion({
  actorUser,
  input,
  reason = null,
  transaction = null,
}) {
  const actor = assertAuthorizedPromotionActor(actorUser);
  const normalizedInput = normalizePromotionPayload(input || {});

  if (!CREATEABLE_PROMOTION_STATUSES.has(normalizedInput.status)) {
    throw new Error("New promotions cannot start in DEACTIVATED status");
  }

  return runInTransaction(transaction, async (activeTransaction) => {
    if (
      normalizedInput.kind === "GENERIC" &&
      normalizedInput.status === "ACTIVE"
    ) {
      await assertNoActiveGenericCodeConflict({
        code: normalizedInput.code,
        transaction: activeTransaction,
      });
    }

    let promotion;

    try {
      promotion = await models.Promotion.create(
        {
          ...normalizedInput,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        { transaction: activeTransaction },
      );
    } catch (error) {
      if (
        normalizedInput.kind === "GENERIC" &&
        normalizedInput.status === "ACTIVE"
      ) {
        rethrowKnownUniqueConstraint(
          error,
          ACTIVE_GENERIC_CODE_CONSTRAINT,
          ACTIVE_GENERIC_CODE_CONFLICT_MESSAGE,
        );
      }

      throw error;
    }

    const afterState = buildPromotionSnapshot(promotion);

    await createPromotionAuditEvent({
      promotionId: promotion.id,
      actorUserId: actor.id,
      action: "CREATED",
      beforeState: null,
      afterState,
      reason,
      transaction: activeTransaction,
    });

    return afterState;
  });
}

export async function updatePromotion({
  actorUser,
  promotionId,
  input,
  reason = null,
  transaction = null,
}) {
  const actor = assertAuthorizedPromotionActor(actorUser);

  if (input && Object.hasOwn(input, "status")) {
    throw new Error(
      "Promotion status must be changed through activate, pause, or deactivate actions",
    );
  }

  return runInTransaction(transaction, async (activeTransaction) => {
    const promotion = await findPromotionForUpdate(
      promotionId,
      activeTransaction,
    );

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    const beforeState = buildPromotionSnapshot(promotion);
    const mergedInput = mergePromotionInput(promotion, input || {});
    const normalizedInput = normalizePromotionPayload(mergedInput, {
      existingPromotion: promotion,
    });

    if (!hasMeaningfulPromotionChanges(beforeState, normalizedInput)) {
      return beforeState;
    }

    if (
      normalizedInput.kind === "GENERIC" &&
      normalizedInput.status === "ACTIVE"
    ) {
      await assertNoActiveGenericCodeConflict({
        code: normalizedInput.code,
        excludePromotionId: promotion.id,
        transaction: activeTransaction,
      });
    }

    try {
      await promotion.update(
        {
          ...normalizedInput,
          updatedByUserId: actor.id,
        },
        { transaction: activeTransaction },
      );
    } catch (error) {
      if (
        normalizedInput.kind === "GENERIC" &&
        normalizedInput.status === "ACTIVE"
      ) {
        rethrowKnownUniqueConstraint(
          error,
          ACTIVE_GENERIC_CODE_CONSTRAINT,
          ACTIVE_GENERIC_CODE_CONFLICT_MESSAGE,
        );
      }

      throw error;
    }

    const afterState = buildPromotionSnapshot(promotion);

    await createPromotionAuditEvent({
      promotionId: promotion.id,
      actorUserId: actor.id,
      action: "UPDATED",
      beforeState,
      afterState,
      reason,
      transaction: activeTransaction,
    });

    return afterState;
  });
}

async function transitionPromotionStatus({
  actorUser,
  promotionId,
  targetStatus,
  action,
  reason = null,
  transaction = null,
}) {
  const actor = assertAuthorizedPromotionActor(actorUser);
  const normalizedTargetStatus = normalizeStatus(targetStatus);

  return runInTransaction(transaction, async (activeTransaction) => {
    const promotion = await findPromotionForUpdate(
      promotionId,
      activeTransaction,
    );

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    if (promotion.status === normalizedTargetStatus) {
      return buildPromotionSnapshot(promotion);
    }

    if (
      promotion.status === "DEACTIVATED" &&
      normalizedTargetStatus !== "DEACTIVATED"
    ) {
      throw new Error("Deactivated promotions cannot change status");
    }

    if (normalizedTargetStatus === "ACTIVE" && promotion.kind === "GENERIC") {
      await assertNoActiveGenericCodeConflict({
        code: promotion.code,
        excludePromotionId: promotion.id,
        transaction: activeTransaction,
      });
    }

    const beforeState = buildPromotionSnapshot(promotion);

    try {
      await promotion.update(
        {
          status: normalizedTargetStatus,
          updatedByUserId: actor.id,
        },
        { transaction: activeTransaction },
      );
    } catch (error) {
      if (normalizedTargetStatus === "ACTIVE" && promotion.kind === "GENERIC") {
        rethrowKnownUniqueConstraint(
          error,
          ACTIVE_GENERIC_CODE_CONSTRAINT,
          ACTIVE_GENERIC_CODE_CONFLICT_MESSAGE,
        );
      }

      throw error;
    }

    const afterState = buildPromotionSnapshot(promotion);

    await createPromotionAuditEvent({
      promotionId: promotion.id,
      actorUserId: actor.id,
      action,
      beforeState,
      afterState,
      reason,
      transaction: activeTransaction,
    });

    return afterState;
  });
}

export async function activatePromotion({
  actorUser,
  promotionId,
  reason = null,
  transaction = null,
}) {
  return transitionPromotionStatus({
    actorUser,
    promotionId,
    targetStatus: "ACTIVE",
    action: "ACTIVATED",
    reason,
    transaction,
  });
}

export async function pausePromotion({
  actorUser,
  promotionId,
  reason = null,
  transaction = null,
}) {
  return transitionPromotionStatus({
    actorUser,
    promotionId,
    targetStatus: "PAUSED",
    action: "PAUSED",
    reason,
    transaction,
  });
}

export async function deactivatePromotion({
  actorUser,
  promotionId,
  reason = null,
  transaction = null,
}) {
  return transitionPromotionStatus({
    actorUser,
    promotionId,
    targetStatus: "DEACTIVATED",
    action: "DEACTIVATED",
    reason,
    transaction,
  });
}

export async function assignPromotionCustomer({
  actorUser,
  promotionId,
  userId,
  notes = null,
  reason = null,
  transaction = null,
}) {
  const actor = assertAuthorizedPromotionActor(actorUser);
  const normalizedUserId = normalizeRequiredId(userId, "Customer user ID");
  const normalizedNotes = normalizeOptionalText(notes);

  return runInTransaction(transaction, async (activeTransaction) => {
    const promotion = await findPromotionForUpdate(
      promotionId,
      activeTransaction,
    );

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    if (promotion.kind !== "PERSONAL") {
      throw new Error("Only personal promotions may be assigned to customers");
    }

    const customer = await models.User.findOne({
      where: {
        id: normalizedUserId,
        role: USER_ROLES.CUSTOMER,
        disabledAt: null,
      },
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
    });

    if (!customer) {
      throw new Error("Customer account not found");
    }

    const existingAssignment = await models.PromotionAssignment.findOne({
      where: {
        promotionId: promotion.id,
        userId: normalizedUserId,
        unassignedAt: null,
      },
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
    });

    if (existingAssignment) {
      throw new Error(DUPLICATE_ACTIVE_ASSIGNMENT_MESSAGE);
    }

    let assignment;

    try {
      assignment = await models.PromotionAssignment.create(
        {
          promotionId: promotion.id,
          userId: normalizedUserId,
          assignedAt: new Date(),
          assignedByUserId: actor.id,
          notes: normalizedNotes,
        },
        { transaction: activeTransaction },
      );
    } catch (error) {
      rethrowKnownUniqueConstraint(
        error,
        ACTIVE_ASSIGNMENT_CONSTRAINT,
        DUPLICATE_ACTIVE_ASSIGNMENT_MESSAGE,
      );
    }

    await createPromotionAuditEvent({
      promotionId: promotion.id,
      promotionAssignmentId: assignment.id,
      actorUserId: actor.id,
      action: "ASSIGNED",
      beforeState: null,
      afterState: buildPromotionAssignmentSnapshot({
        ...assignment.get({ plain: true }),
        user: customer,
      }),
      reason,
      metadata: {
        customerUserId: normalizedUserId,
      },
      transaction: activeTransaction,
    });

    const refreshedPromotion = await findPromotionForAdminView(
      promotion.id,
      activeTransaction,
    );

    return buildPromotionSnapshot(refreshedPromotion);
  });
}

export async function unassignPromotionCustomer({
  actorUser,
  promotionId,
  userId,
  reason = null,
  transaction = null,
}) {
  const actor = assertAuthorizedPromotionActor(actorUser);
  const normalizedUserId = normalizeRequiredId(userId, "Customer user ID");

  return runInTransaction(transaction, async (activeTransaction) => {
    const promotion = await findPromotionForUpdate(
      promotionId,
      activeTransaction,
    );

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    if (promotion.kind !== "PERSONAL") {
      throw new Error(
        "Only personal promotions may be unassigned from customers",
      );
    }

    const assignment = await models.PromotionAssignment.findOne({
      where: {
        promotionId: promotion.id,
        userId: normalizedUserId,
        unassignedAt: null,
      },
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
    });

    if (!assignment) {
      throw new Error("Active promotion assignment not found");
    }

    const customer = await models.User.findOne({
      where: {
        id: normalizedUserId,
        role: USER_ROLES.CUSTOMER,
      },
      transaction: activeTransaction,
    });

    if (!customer) {
      throw new Error("Customer account not found");
    }

    const beforeState = buildPromotionAssignmentSnapshot({
      ...assignment.get({ plain: true }),
      user: customer,
    });

    await assignment.update(
      {
        unassignedAt: new Date(),
        unassignedByUserId: actor.id,
      },
      { transaction: activeTransaction },
    );

    const afterState = buildPromotionAssignmentSnapshot({
      ...assignment.get({ plain: true }),
      user: customer,
    });

    await createPromotionAuditEvent({
      promotionId: promotion.id,
      promotionAssignmentId: assignment.id,
      actorUserId: actor.id,
      action: "UNASSIGNED",
      beforeState,
      afterState,
      reason,
      metadata: {
        customerUserId: normalizedUserId,
      },
      transaction: activeTransaction,
    });

    const refreshedPromotion = await findPromotionForAdminView(
      promotion.id,
      activeTransaction,
    );

    return buildPromotionSnapshot(refreshedPromotion);
  });
}

export const deletePromotion = deactivatePromotion;
