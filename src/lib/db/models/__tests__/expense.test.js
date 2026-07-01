import "../../relations.js";
import Expense from "../expense.js";
import User from "../user.js";

describe("Expense Sequelize model", () => {
  it("maps v1 finance fields, soft-delete metadata, and indexes", () => {
    expect(Expense.rawAttributes.amount.allowNull).toBe(false);
    expect(Expense.rawAttributes.expenseDate.field).toBe("expense_date");
    expect(Expense.rawAttributes.category.type.options.length).toBe(64);
    expect(Expense.rawAttributes.createdByUserId.allowNull).toBe(false);
    expect(Expense.rawAttributes.updatedByUserId.allowNull).toBe(false);
    expect(Expense.rawAttributes.deletedByUserId.field).toBe(
      "deleted_by_user_id",
    );
    expect(Expense.rawAttributes.deleteReason.field).toBe("delete_reason");
    expect(Expense.rawAttributes.deletedAt.field).toBe("deleted_at");
    expect(Expense.options.paranoid).toBe(true);
    expect(Expense.options.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "expenses_active_expense_date_idx",
          fields: ["expense_date"],
          where: { deleted_at: null },
        }),
        expect.objectContaining({
          name: "expenses_active_category_idx",
          fields: ["category"],
          where: { deleted_at: null },
        }),
        expect.objectContaining({
          name: "expenses_active_expense_date_category_idx",
          fields: ["expense_date", "category"],
          where: { deleted_at: null },
        }),
      ]),
    );
  });

  it("defines creator, updater, and deleter user associations", () => {
    expect(Expense.associations.createdByUser.target).toBe(User);
    expect(Expense.associations.updatedByUser.target).toBe(User);
    expect(Expense.associations.deletedByUser.target).toBe(User);
    expect(User.associations.createdExpenses.target).toBe(Expense);
    expect(User.associations.updatedExpenses.target).toBe(Expense);
    expect(User.associations.deletedExpenses.target).toBe(Expense);
  });
});
