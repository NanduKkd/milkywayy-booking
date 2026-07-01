import { Op } from "sequelize";
import { USER_ROLES } from "@/lib/config/app.config";
import {
  EXPENSE_CATEGORY_KEYS,
  getExpenseCategoryDefinitions,
  getExpenseCategoryLabel,
} from "@/lib/config/expenseCategories";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";

export const EXPENSE_ADMIN_AUTHORIZATION_MODE = "SUPERADMIN_COMPAT";

const MAX_AMOUNT = 99999999.99;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_DELETE_REASON_LENGTH = 500;
const EXPENSE_MUTATION_INCLUDE = [
  {
    model: models.User,
    as: "createdByUser",
    attributes: ["id", "fullName", "email"],
    required: false,
  },
  {
    model: models.User,
    as: "updatedByUser",
    attributes: ["id", "fullName", "email"],
    required: false,
  },
  {
    model: models.User,
    as: "deletedByUser",
    attributes: ["id", "fullName", "email"],
    required: false,
  },
];

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

function normalizeBoolean(value, label) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  throw new Error(`${label} must be true or false`);
}

function normalizeOptionalText(value, { label, maxLength }) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

function normalizeRequiredText(value, { label, maxLength }) {
  const normalized = normalizeOptionalText(value, { label, maxLength });

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function normalizeDateOnly(value, label) {
  const normalized = String(value ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const resolved = new Date(Date.UTC(year, month - 1, day));

  if (
    resolved.getUTCFullYear() !== year ||
    resolved.getUTCMonth() !== month - 1 ||
    resolved.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a valid calendar date`);
  }

  return normalized;
}

function normalizeAmount(value, label) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${label} must be a positive amount with up to 2 decimals`);
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }

  if (parsed > MAX_AMOUNT) {
    throw new Error(`${label} must be ${MAX_AMOUNT.toFixed(2)} or less`);
  }

  return parsed.toFixed(2);
}

function normalizeCategory(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    throw new Error("Expense category is required");
  }

  if (!EXPENSE_CATEGORY_KEYS.has(normalized)) {
    throw new Error("Expense category is unsupported");
  }

  return normalized;
}

function assertAuthorizedExpenseActor(actorUser) {
  if (!actorUser?.id) {
    throw new Error("Unauthorized");
  }

  if (actorUser.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Expense admin access required");
  }

  return {
    id: normalizeRequiredId(actorUser.id, "Actor user ID"),
    role: actorUser.role,
  };
}

function normalizeExpenseInput(input, { existingExpense = null } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Expense input must be an object");
  }

  const current = existingExpense
    ? buildExpenseSnapshot(existingExpense)
    : null;
  const merged = {
    amount: Object.hasOwn(input, "amount") ? input.amount : current?.amount,
    expenseDate: Object.hasOwn(input, "expenseDate")
      ? input.expenseDate
      : current?.expenseDate,
    category: Object.hasOwn(input, "category")
      ? input.category
      : current?.category,
    description: Object.hasOwn(input, "description")
      ? input.description
      : current?.description,
  };

  return {
    amount: normalizeAmount(merged.amount, "Expense amount"),
    expenseDate: normalizeDateOnly(merged.expenseDate, "Expense date"),
    category: normalizeCategory(merged.category),
    description: normalizeOptionalText(merged.description, {
      label: "Expense description",
      maxLength: MAX_DESCRIPTION_LENGTH,
    }),
  };
}

function normalizeListFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new Error("Expense filters must be an object");
  }

  const hasRangeStart = Object.hasOwn(filters, "rangeStart");
  const hasRangeEnd = Object.hasOwn(filters, "rangeEnd");

  if (hasRangeStart !== hasRangeEnd) {
    throw new Error("rangeStart and rangeEnd must be provided together");
  }

  const normalized = {
    rangeStart: null,
    rangeEnd: null,
    category: null,
    includeDeleted: false,
  };

  if (hasRangeStart && hasRangeEnd) {
    normalized.rangeStart = normalizeDateOnly(
      filters.rangeStart,
      "Expense rangeStart",
    );
    normalized.rangeEnd = normalizeDateOnly(
      filters.rangeEnd,
      "Expense rangeEnd",
    );

    if (normalized.rangeEnd < normalized.rangeStart) {
      throw new Error("Expense rangeEnd must be on or after rangeStart");
    }
  }

  if (Object.hasOwn(filters, "category") && filters.category != null) {
    normalized.category = normalizeCategory(filters.category);
  }

  if (Object.hasOwn(filters, "includeDeleted")) {
    normalized.includeDeleted = normalizeBoolean(
      filters.includeDeleted,
      "includeDeleted",
    );
  }

  return normalized;
}

function buildUserSnapshot(user) {
  if (!user) {
    return null;
  }

  const plain =
    typeof user.get === "function" ? user.get({ plain: true }) : user;

  return {
    id: plain.id == null ? null : Number(plain.id),
    fullName: plain.fullName || null,
    email: plain.email || null,
  };
}

function buildExpenseSnapshot(expense) {
  if (!expense) {
    return null;
  }

  const plain =
    typeof expense.get === "function" ? expense.get({ plain: true }) : expense;

  return {
    id: plain.id == null ? null : Number(plain.id),
    amount: plain.amount == null ? null : Number(plain.amount),
    expenseDate: plain.expenseDate || null,
    category: plain.category || null,
    categoryLabel: getExpenseCategoryLabel(plain.category),
    description: plain.description || null,
    createdByUserId:
      plain.createdByUserId == null ? null : Number(plain.createdByUserId),
    updatedByUserId:
      plain.updatedByUserId == null ? null : Number(plain.updatedByUserId),
    deletedByUserId:
      plain.deletedByUserId == null ? null : Number(plain.deletedByUserId),
    deleteReason: plain.deleteReason || null,
    deletedAt: plain.deletedAt ? new Date(plain.deletedAt).toISOString() : null,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : null,
    createdByUser: buildUserSnapshot(plain.createdByUser),
    updatedByUser: buildUserSnapshot(plain.updatedByUser),
    deletedByUser: buildUserSnapshot(plain.deletedByUser),
  };
}

function buildComparableExpenseState(expenseSnapshot) {
  return {
    amount:
      expenseSnapshot?.amount == null ? null : Number(expenseSnapshot.amount),
    expenseDate: expenseSnapshot?.expenseDate ?? null,
    category: expenseSnapshot?.category ?? null,
    description: expenseSnapshot?.description ?? null,
    deletedByUserId: expenseSnapshot?.deletedByUserId ?? null,
    deleteReason: expenseSnapshot?.deleteReason ?? null,
    deletedAt: expenseSnapshot?.deletedAt ?? null,
  };
}

function hasMeaningfulExpenseChanges(beforeState, afterState) {
  return (
    JSON.stringify(buildComparableExpenseState(beforeState)) !==
    JSON.stringify(buildComparableExpenseState(afterState))
  );
}

async function findExpenseById(expenseId, { transaction, includeDeleted }) {
  return models.Expense.findByPk(expenseId, {
    include: EXPENSE_MUTATION_INCLUDE,
    paranoid: !includeDeleted,
    transaction,
  });
}

async function findActiveExpenseForUpdate(expenseId, transaction) {
  const normalizedExpenseId = normalizeRequiredId(expenseId, "Expense ID");

  return models.Expense.findByPk(normalizedExpenseId, {
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
}

async function createExpenseAuditEvent({
  expenseId,
  actorUserId,
  action,
  beforeState,
  afterState,
  reason = null,
  metadata = {},
  transaction,
}) {
  await models.ExpenseAuditEvent.create(
    {
      expenseId,
      actorUserId,
      action,
      beforeState,
      afterState,
      reason,
      metadata,
    },
    {
      transaction,
    },
  );
}

export async function listExpenses({
  actorUser,
  filters = {},
  transaction = null,
}) {
  assertAuthorizedExpenseActor(actorUser);
  const normalizedFilters = normalizeListFilters(filters);
  const where = {};

  if (normalizedFilters.rangeStart && normalizedFilters.rangeEnd) {
    where.expenseDate = {
      [Op.between]: [normalizedFilters.rangeStart, normalizedFilters.rangeEnd],
    };
  }

  if (normalizedFilters.category) {
    where.category = normalizedFilters.category;
  }

  const expenses = await models.Expense.findAll({
    where,
    include: EXPENSE_MUTATION_INCLUDE,
    paranoid: !normalizedFilters.includeDeleted,
    order: [
      ["expenseDate", "DESC"],
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    transaction,
  });

  return {
    authorizationMode: EXPENSE_ADMIN_AUTHORIZATION_MODE,
    categories: getExpenseCategoryDefinitions(),
    filters: normalizedFilters,
    items: expenses.map((expense) => buildExpenseSnapshot(expense)),
  };
}

export async function createExpense({
  actorUser,
  input,
  reason = null,
  transaction = null,
}) {
  const authorizedActor = assertAuthorizedExpenseActor(actorUser);
  const normalizedInput = normalizeExpenseInput(input);

  return runInTransaction(transaction, async (activeTransaction) => {
    const createdExpense = await models.Expense.create(
      {
        ...normalizedInput,
        createdByUserId: authorizedActor.id,
        updatedByUserId: authorizedActor.id,
      },
      {
        transaction: activeTransaction,
      },
    );
    const expenseWithUsers = await findExpenseById(createdExpense.id, {
      transaction: activeTransaction,
      includeDeleted: false,
    });
    const afterState = buildExpenseSnapshot(expenseWithUsers || createdExpense);

    await createExpenseAuditEvent({
      expenseId: createdExpense.id,
      actorUserId: authorizedActor.id,
      action: "CREATED",
      beforeState: null,
      afterState,
      reason,
      metadata: {
        authorizationMode: EXPENSE_ADMIN_AUTHORIZATION_MODE,
      },
      transaction: activeTransaction,
    });

    return afterState;
  });
}

export async function updateExpense({
  actorUser,
  expenseId,
  input,
  reason = null,
  transaction = null,
}) {
  const authorizedActor = assertAuthorizedExpenseActor(actorUser);

  return runInTransaction(transaction, async (activeTransaction) => {
    const existingExpense = await findActiveExpenseForUpdate(
      expenseId,
      activeTransaction,
    );

    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    const beforeState = buildExpenseSnapshot(existingExpense);
    const normalizedInput = normalizeExpenseInput(input, {
      existingExpense,
    });
    const nextState = {
      ...beforeState,
      ...normalizedInput,
    };

    if (!hasMeaningfulExpenseChanges(beforeState, nextState)) {
      return beforeState;
    }

    await existingExpense.update(
      {
        ...normalizedInput,
        updatedByUserId: authorizedActor.id,
      },
      {
        transaction: activeTransaction,
      },
    );

    const updatedExpense = await findExpenseById(existingExpense.id, {
      transaction: activeTransaction,
      includeDeleted: false,
    });
    const afterState = buildExpenseSnapshot(updatedExpense || existingExpense);

    await createExpenseAuditEvent({
      expenseId: existingExpense.id,
      actorUserId: authorizedActor.id,
      action: "UPDATED",
      beforeState,
      afterState,
      reason,
      metadata: {
        authorizationMode: EXPENSE_ADMIN_AUTHORIZATION_MODE,
      },
      transaction: activeTransaction,
    });

    return afterState;
  });
}

export async function deleteExpense({
  actorUser,
  expenseId,
  reason,
  transaction = null,
}) {
  const authorizedActor = assertAuthorizedExpenseActor(actorUser);
  const normalizedReason = normalizeRequiredText(reason, {
    label: "Delete reason",
    maxLength: MAX_DELETE_REASON_LENGTH,
  });

  return runInTransaction(transaction, async (activeTransaction) => {
    const existingExpense = await findActiveExpenseForUpdate(
      expenseId,
      activeTransaction,
    );

    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    const beforeState = buildExpenseSnapshot(existingExpense);

    await existingExpense.update(
      {
        deletedByUserId: authorizedActor.id,
        deleteReason: normalizedReason,
        deletedAt: new Date(),
        updatedByUserId: authorizedActor.id,
      },
      {
        transaction: activeTransaction,
      },
    );

    const deletedExpense = await findExpenseById(existingExpense.id, {
      transaction: activeTransaction,
      includeDeleted: true,
    });
    const afterState = buildExpenseSnapshot(deletedExpense || existingExpense);

    await createExpenseAuditEvent({
      expenseId: existingExpense.id,
      actorUserId: authorizedActor.id,
      action: "DELETED",
      beforeState,
      afterState,
      reason: normalizedReason,
      metadata: {
        authorizationMode: EXPENSE_ADMIN_AUTHORIZATION_MODE,
      },
      transaction: activeTransaction,
    });

    return afterState;
  });
}
