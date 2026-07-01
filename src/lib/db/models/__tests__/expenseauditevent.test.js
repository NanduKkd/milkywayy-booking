import "../../relations.js";
import Expense from "../expense.js";
import ExpenseAuditEvent from "../expenseauditevent.js";
import User from "../user.js";

describe("ExpenseAuditEvent Sequelize model", () => {
  it("maps expense audit fields and indexes", () => {
    expect(ExpenseAuditEvent.rawAttributes.expenseId.field).toBe("expense_id");
    expect(ExpenseAuditEvent.rawAttributes.actorUserId.field).toBe(
      "actor_user_id",
    );
    expect(ExpenseAuditEvent.rawAttributes.action.values).toEqual([
      "CREATED",
      "UPDATED",
      "DELETED",
    ]);
    expect(ExpenseAuditEvent.rawAttributes.beforeState.field).toBe(
      "before_state",
    );
    expect(ExpenseAuditEvent.rawAttributes.afterState.field).toBe(
      "after_state",
    );
    expect(ExpenseAuditEvent.options.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "expense_audit_events_expense_id_idx",
          fields: ["expense_id"],
        }),
        expect.objectContaining({
          name: "expense_audit_events_actor_action_created_at_idx",
          fields: ["actor_user_id", "action", "created_at"],
        }),
      ]),
    );
  });

  it("defines expense and actor associations", () => {
    expect(ExpenseAuditEvent.associations.expense.target).toBe(Expense);
    expect(ExpenseAuditEvent.associations.actorUser.target).toBe(User);
    expect(Expense.associations.auditEvents.target).toBe(ExpenseAuditEvent);
    expect(User.associations.expenseAuditEvents.target).toBe(ExpenseAuditEvent);
  });
});
