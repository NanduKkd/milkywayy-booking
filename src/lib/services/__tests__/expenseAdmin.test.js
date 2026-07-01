import { Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import {
  createExpense,
  deleteExpense,
  EXPENSE_ADMIN_AUTHORIZATION_MODE,
  listExpenses,
  updateExpense,
} from "../expenseAdmin";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

const superadminActor = { id: 11, role: "SUPERADMIN" };
const customerActor = { id: 21, role: "CUSTOMER" };

function buildUser(overrides = {}) {
  const state = {
    id: 11,
    fullName: "Finance Owner",
    email: "finance@example.com",
    ...overrides,
  };

  return {
    ...state,
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
  };
}

function buildExpenseRecord(overrides = {}) {
  const createdByUser = buildUser({ id: 11 });
  const updatedByUser = buildUser({ id: 11 });
  const deletedByUser = overrides.deletedAt ? buildUser({ id: 12 }) : null;
  const state = {
    id: 9,
    amount: "245.50",
    expenseDate: "2026-07-01",
    category: "marketing",
    description: "Meta ads",
    createdByUserId: 11,
    updatedByUserId: 11,
    deletedByUserId: deletedByUser ? 12 : null,
    deleteReason: deletedByUser ? "duplicate entry" : null,
    deletedAt: deletedByUser ? new Date("2026-07-02T10:00:00.000Z") : null,
    createdAt: new Date("2026-07-01T09:00:00.000Z"),
    updatedAt: new Date("2026-07-01T09:00:00.000Z"),
    createdByUser,
    updatedByUser,
    deletedByUser,
    ...overrides,
  };

  return {
    ...state,
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
    update: jest.fn(async (values) => {
      Object.assign(state, values, {
        updatedAt: new Date("2026-07-01T12:00:00.000Z"),
      });

      if (values.deletedByUserId) {
        state.deletedByUser = buildUser({ id: values.deletedByUserId });
      }

      return {
        ...state,
        get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
      };
    }),
  };
}

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    Expense: {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    },
    ExpenseAuditEvent: {
      create: jest.fn(),
    },
    User: {},
  },
}));

describe("expenseAdmin service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists expenses with validated filters and optional deleted rows", async () => {
    const activeExpense = buildExpenseRecord();
    const deletedExpense = buildExpenseRecord({
      id: 10,
      category: "software",
      deletedByUserId: 12,
      deleteReason: "duplicate entry",
      deletedAt: new Date("2026-07-02T10:00:00.000Z"),
    });

    models.Expense.findAll.mockResolvedValue([activeExpense, deletedExpense]);

    const result = await listExpenses({
      actorUser: superadminActor,
      filters: {
        rangeStart: "2026-07-01",
        rangeEnd: "2026-07-31",
        category: "marketing",
        includeDeleted: "true",
      },
    });

    expect(models.Expense.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          expenseDate: {
            [Op.between]: ["2026-07-01", "2026-07-31"],
          },
          category: "marketing",
        },
        paranoid: false,
      }),
    );
    expect(result.authorizationMode).toBe(EXPENSE_ADMIN_AUTHORIZATION_MODE);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 9,
        category: "marketing",
        categoryLabel: "Marketing",
      }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        id: 10,
        deletedByUserId: 12,
        deleteReason: "duplicate entry",
      }),
    );
  });

  it("rejects unauthorized actors for every expense mutation", async () => {
    await expect(
      createExpense({
        actorUser: customerActor,
        input: {
          amount: "100.00",
          expenseDate: "2026-07-01",
          category: "office",
        },
      }),
    ).rejects.toThrow("Unauthorized: Expense admin access required");

    await expect(
      updateExpense({
        actorUser: customerActor,
        expenseId: 9,
        input: {
          amount: "101.00",
          expenseDate: "2026-07-01",
          category: "office",
        },
      }),
    ).rejects.toThrow("Unauthorized: Expense admin access required");

    await expect(
      deleteExpense({
        actorUser: customerActor,
        expenseId: 9,
        reason: "duplicate entry",
      }),
    ).rejects.toThrow("Unauthorized: Expense admin access required");

    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(models.Expense.create).not.toHaveBeenCalled();
    expect(models.Expense.findByPk).not.toHaveBeenCalled();
    expect(models.ExpenseAuditEvent.create).not.toHaveBeenCalled();
  });

  it("creates an expense and records an audit event", async () => {
    const createdExpense = buildExpenseRecord({
      id: 88,
      amount: "1250.00",
      expenseDate: "2026-07-03",
      category: "rent",
      description: "July studio rent",
      createdByUserId: 11,
      updatedByUserId: 11,
    });

    models.Expense.create.mockResolvedValue(createdExpense);
    models.Expense.findByPk.mockResolvedValue(createdExpense);

    const result = await createExpense({
      actorUser: superadminActor,
      input: {
        amount: "1250",
        expenseDate: "2026-07-03",
        category: "rent",
        description: "July studio rent",
      },
      reason: "backfill approved invoice",
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Expense.create).toHaveBeenCalledWith(
      {
        amount: "1250.00",
        expenseDate: "2026-07-03",
        category: "rent",
        description: "July studio rent",
        createdByUserId: 11,
        updatedByUserId: 11,
      },
      {
        transaction: mockTransaction,
      },
    );
    expect(models.ExpenseAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expenseId: 88,
        actorUserId: 11,
        action: "CREATED",
        reason: "backfill approved invoice",
        metadata: {
          authorizationMode: EXPENSE_ADMIN_AUTHORIZATION_MODE,
        },
      }),
      {
        transaction: mockTransaction,
      },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 88,
        amount: 1250,
        categoryLabel: "Rent",
      }),
    );
  });

  it("updates an expense and records an audit event only when fields change", async () => {
    const existingExpense = buildExpenseRecord();
    const updatedExpense = buildExpenseRecord({
      amount: "300.00",
      category: "software",
      description: "Subscription renewal",
      updatedByUserId: 11,
    });

    models.Expense.findByPk
      .mockResolvedValueOnce(existingExpense)
      .mockResolvedValueOnce(updatedExpense);

    const result = await updateExpense({
      actorUser: superadminActor,
      expenseId: 9,
      input: {
        amount: "300.00",
        category: "software",
        description: "Subscription renewal",
      },
    });

    expect(existingExpense.update).toHaveBeenCalledWith(
      {
        amount: "300.00",
        expenseDate: "2026-07-01",
        category: "software",
        description: "Subscription renewal",
        updatedByUserId: 11,
      },
      {
        transaction: mockTransaction,
      },
    );
    expect(models.ExpenseAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATED",
        beforeState: expect.objectContaining({
          amount: 245.5,
          category: "marketing",
        }),
        afterState: expect.objectContaining({
          amount: 300,
          category: "software",
        }),
      }),
      {
        transaction: mockTransaction,
      },
    );
    expect(result).toEqual(
      expect.objectContaining({
        amount: 300,
        category: "software",
      }),
    );
  });

  it("returns the existing expense without auditing when no update is needed", async () => {
    const existingExpense = buildExpenseRecord();

    models.Expense.findByPk.mockResolvedValue(existingExpense);

    const result = await updateExpense({
      actorUser: superadminActor,
      expenseId: 9,
      input: {
        amount: "245.50",
        expenseDate: "2026-07-01",
        category: "marketing",
        description: "Meta ads",
      },
    });

    expect(existingExpense.update).not.toHaveBeenCalled();
    expect(models.ExpenseAuditEvent.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 9,
        amount: 245.5,
      }),
    );
  });

  it("soft deletes an expense with a required reason and audits it", async () => {
    const existingExpense = buildExpenseRecord();
    const deletedExpense = buildExpenseRecord({
      deletedByUserId: 11,
      deleteReason: "duplicate entry",
      deletedAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedByUserId: 11,
    });

    models.Expense.findByPk
      .mockResolvedValueOnce(existingExpense)
      .mockResolvedValueOnce(deletedExpense);

    const result = await deleteExpense({
      actorUser: superadminActor,
      expenseId: 9,
      reason: "duplicate entry",
    });

    expect(existingExpense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedByUserId: 11,
        deleteReason: "duplicate entry",
        deletedAt: expect.any(Date),
        updatedByUserId: 11,
      }),
      {
        transaction: mockTransaction,
      },
    );
    expect(models.ExpenseAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expenseId: 9,
        actorUserId: 11,
        action: "DELETED",
        beforeState: expect.objectContaining({
          id: 9,
          amount: 245.5,
          deletedByUserId: null,
          deleteReason: null,
        }),
        afterState: expect.objectContaining({
          id: 9,
          amount: 245.5,
          deletedByUserId: 11,
          deleteReason: "duplicate entry",
          deletedAt: expect.any(String),
        }),
        reason: "duplicate entry",
        metadata: {
          authorizationMode: EXPENSE_ADMIN_AUTHORIZATION_MODE,
        },
      }),
      {
        transaction: mockTransaction,
      },
    );
    expect(result).toEqual(
      expect.objectContaining({
        deletedByUserId: 11,
        deleteReason: "duplicate entry",
      }),
    );
  });

  it("rejects invalid mutations before writing or auditing", async () => {
    const existingExpense = buildExpenseRecord();

    await expect(
      createExpense({
        actorUser: superadminActor,
        input: {
          amount: "-4.00",
          expenseDate: "2026-07-01",
          category: "marketing",
        },
      }),
    ).rejects.toThrow(
      "Expense amount must be a positive amount with up to 2 decimals",
    );

    models.Expense.findByPk.mockResolvedValue(existingExpense);

    await expect(
      updateExpense({
        actorUser: superadminActor,
        expenseId: 9,
        input: {
          category: "invalid-category",
        },
      }),
    ).rejects.toThrow("Expense category is unsupported");

    await expect(
      deleteExpense({
        actorUser: superadminActor,
        expenseId: 9,
        reason: "",
      }),
    ).rejects.toThrow("Delete reason is required");

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Expense.create).not.toHaveBeenCalled();
    expect(existingExpense.update).not.toHaveBeenCalled();
    expect(models.ExpenseAuditEvent.create).not.toHaveBeenCalled();
  });
});
