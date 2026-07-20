"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminCard,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminDialogContent,
  AdminEmptyState,
  AdminInlineMessage,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const EXPENSE_PAGE_SIZE = 5;
const EXPENSE_COLORS = ["#f43f5e", "#f59e0b", "#8b5cf6", "#3b82f6", "#10b981"];

function formatCurrency(value) {
  return new Intl.NumberFormat("en", {
    currency: "AED",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value || 0));
}

function formatCount(value) {
  return new Intl.NumberFormat("en").format(Number(value || 0));
}

function formatBusinessDate(value) {
  if (!value) {
    return "Unknown date";
  }

  const [year, month, day] = String(value).split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function buildExpensesQuery({ rangeEnd, rangeStart }) {
  const params = new URLSearchParams({
    rangeEnd,
    rangeStart,
  });

  return `/api/admin/expenses?${params.toString()}`;
}

function buildDefaultExpenseDate(rangeStart, rangeEnd) {
  const today = new Date().toISOString().slice(0, 10);

  if (today >= rangeStart && today <= rangeEnd) {
    return today;
  }

  return rangeStart;
}

function buildEmptyExpenseForm({ categories, rangeEnd, rangeStart }) {
  return {
    amount: "",
    category: categories[0]?.key || "",
    description: "",
    expenseDate: buildDefaultExpenseDate(rangeStart, rangeEnd),
  };
}

function buildExpenseFormState(expense) {
  return {
    amount:
      expense?.amount == null || Number.isNaN(Number(expense.amount))
        ? ""
        : Number(expense.amount).toFixed(2),
    category: expense?.category || "",
    description: expense?.description || "",
    expenseDate: expense?.expenseDate || "",
  };
}

function normalizeListPayload(payload) {
  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    items: Array.isArray(payload?.items) ? payload.items : [],
  };
}

function LoadingState() {
  return (
    <section
      aria-label="Loading expense tracker"
      className="space-y-4 animate-pulse"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {["expense-kpi-1", "expense-kpi-2", "expense-kpi-3"].map((key) => (
          <div
            key={key}
            className="h-28 rounded-lg border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="h-72 rounded-lg border border-white/10 bg-white/[0.04]" />
    </section>
  );
}

function ExpenseDialog({
  categories,
  mode,
  onClose,
  onSubmit,
  open,
  state,
  submitting,
  onStateChange,
}) {
  const title = mode === "edit" ? "Edit expense" : "Add expense";
  const actionLabel = mode === "edit" ? "Save changes" : "Create expense";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminDialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        description="Save a finance expense with the same month filter used by the live reports."
        title={title}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Amount (AED)</p>
              <Input
                aria-label="Expense amount"
                inputMode="decimal"
                onChange={(event) =>
                  onStateChange((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={state.amount}
              />
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Expense date</p>
              <Input
                aria-label="Expense date"
                max={state.rangeEnd}
                min={state.rangeStart}
                onChange={(event) =>
                  onStateChange((current) => ({
                    ...current,
                    expenseDate: event.target.value,
                  }))
                }
                required
                type="date"
                value={state.expenseDate}
              />
            </div>
          </div>

          <label className="space-y-2 text-sm text-muted-foreground">
            Category
            <select
              aria-label="Expense category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onChange={(event) =>
                onStateChange((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              required
              value={state.category}
            >
              {categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Description</p>
            <Textarea
              aria-label="Expense description"
              maxLength={2000}
              onChange={(event) =>
                onStateChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Optional notes for this expense"
              value={state.description}
            />
          </div>

          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? "Saving..." : actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </AdminDialogContent>
    </Dialog>
  );
}

function DeleteExpenseDialog({
  expense,
  onClose,
  onConfirm,
  onReasonChange,
  open,
  reason,
  submitting,
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminDialogContent
        className="sm:max-w-lg"
        description="This removes the expense from live reporting by soft deletion and requires a reason for the audit trail."
        title="Delete expense"
      >
        <div className="admin-panel-subtle rounded-lg border border-[hsl(var(--admin-border)/0.72)] p-4">
          <p className="text-sm font-medium text-[hsl(var(--admin-foreground))]">
            {expense?.categoryLabel || expense?.category || "Expense"}
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--admin-muted))]">
            {formatBusinessDate(expense?.expenseDate)} ·{" "}
            {formatCurrency(expense?.amount)}
          </p>
          {expense?.description ? (
            <p className="mt-2 text-sm text-[hsl(var(--admin-muted))]">
              {expense.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Delete reason</p>
          <Textarea
            aria-label="Delete reason"
            maxLength={500}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Why should this expense be removed?"
            required
            value={reason}
          />
        </div>

        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={submitting || !String(reason).trim()}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {submitting ? "Deleting..." : "Confirm delete"}
          </Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}

export default function ExpenseTrackerSection({
  onDataChanged,
  rangeEnd,
  rangeStart,
  reloadToken,
  selectedMonthLabel,
}) {
  const [categories, setCategories] = useState([]);
  const [deleteReason, setDeleteReason] = useState("");
  const [dialogMode, setDialogMode] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [formState, setFormState] = useState({
    amount: "",
    category: "",
    description: "",
    expenseDate: "",
    rangeEnd,
    rangeStart,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void reloadToken;

    const controller = new AbortController();

    async function loadExpenses() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildExpensesQuery({
            rangeEnd,
            rangeStart,
          }),
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load expenses");
        }

        const normalized = normalizeListPayload(payload);

        setCategories(normalized.categories);
        setExpenses(normalized.items);
        setPage(1);
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return;
        }

        setCategories([]);
        setExpenses([]);
        setError(requestError?.message || "Failed to load expenses");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadExpenses();

    return () => controller.abort();
  }, [rangeEnd, rangeStart, reloadToken]);

  const totalExpenses = useMemo(
    () =>
      expenses.reduce((sum, expense) => sum + Number(expense?.amount || 0), 0),
    [expenses],
  );

  const categoryBreakdown = useMemo(() => {
    const totalsByCategory = new Map(
      categories.map((category) => [
        category.key,
        { amount: 0, count: 0, key: category.key, label: category.label },
      ]),
    );

    expenses.forEach((expense) => {
      const categoryKey = expense?.category;
      const entry = totalsByCategory.get(categoryKey) || {
        amount: 0,
        count: 0,
        key: categoryKey || "unknown",
        label: expense?.categoryLabel || categoryKey || "Unknown",
      };

      entry.amount += Number(expense?.amount || 0);
      entry.count += 1;

      totalsByCategory.set(entry.key, entry);
    });

    return Array.from(totalsByCategory.values())
      .filter((entry) => entry.amount > 0)
      .sort((left, right) => right.amount - left.amount);
  }, [categories, expenses]);
  const totalPages = Math.max(
    Math.ceil(expenses.length / EXPENSE_PAGE_SIZE),
    1,
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedExpenses = expenses.slice(
    (currentPage - 1) * EXPENSE_PAGE_SIZE,
    currentPage * EXPENSE_PAGE_SIZE,
  );

  function closeDialogs() {
    setDeleteReason("");
    setDialogMode(null);
    setEditingExpense(null);
    setSubmitting(false);
  }

  function openCreateDialog() {
    setEditingExpense(null);
    setDeleteReason("");
    setFormState((current) => ({
      ...current,
      ...buildEmptyExpenseForm({ categories, rangeEnd, rangeStart }),
      rangeEnd,
      rangeStart,
    }));
    setDialogMode("create");
  }

  function openEditDialog(expense) {
    setEditingExpense(expense);
    setDeleteReason("");
    setFormState({
      ...buildExpenseFormState(expense),
      rangeEnd,
      rangeStart,
    });
    setDialogMode("edit");
  }

  function openDeleteDialog(expense) {
    setEditingExpense(expense);
    setDeleteReason("");
    setDialogMode("delete");
  }

  async function submitExpenseForm() {
    setSubmitting(true);

    const url =
      dialogMode === "edit" && editingExpense
        ? `/api/admin/expenses/${editingExpense.id}`
        : "/api/admin/expenses";
    const method = dialogMode === "edit" ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        body: JSON.stringify({
          amount: formState.amount,
          category: formState.category,
          description: formState.description,
          expenseDate: formState.expenseDate,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save expense");
      }

      toast.success(
        dialogMode === "edit" ? "Expense updated" : "Expense created",
      );
      closeDialogs();
      onDataChanged?.();
    } catch (requestError) {
      setSubmitting(false);
      toast.error(requestError?.message || "Failed to save expense");
    }
  }

  async function confirmDelete() {
    if (!editingExpense) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/expenses/${editingExpense.id}`, {
        body: JSON.stringify({ reason: deleteReason }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete expense");
      }

      toast.success("Expense deleted");
      closeDialogs();
      onDataChanged?.();
    } catch (requestError) {
      setSubmitting(false);
      toast.error(requestError?.message || "Failed to delete expense");
    }
  }

  return (
    <section aria-labelledby="expense-tracker-heading">
      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="space-y-4">
          <AdminInlineMessage
            description={error}
            title="Expense tracker unavailable"
            tone="danger"
          />
          <Button onClick={onDataChanged} type="button" variant="outline">
            Retry
          </Button>
        </div>
      ) : null}

      {!loading && !error ? (
        <AdminCard className="overflow-hidden rounded-xl border-zinc-800 bg-zinc-900">
          <AdminCardHeader className="border-b border-zinc-800 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-950">
                  <ReceiptText className="h-4 w-4 text-rose-400" />
                </span>
                <div>
                  <AdminCardTitle
                    id="expense-tracker-heading"
                    className="text-sm"
                  >
                    Expense Tracker
                  </AdminCardTitle>
                  <AdminCardDescription className="mt-0.5 text-xs">
                    Log and categorise business expenses · {selectedMonthLabel}
                  </AdminCardDescription>
                </div>
              </div>
              <Button
                className="rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                disabled={categories.length === 0}
                onClick={openCreateDialog}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            </div>
          </AdminCardHeader>

          <div className="grid grid-cols-1 gap-px border-b border-zinc-800 bg-zinc-800 sm:grid-cols-3">
            {[
              {
                color: "text-rose-400",
                label: "Total Expenses",
                value: formatCurrency(totalExpenses),
              },
              {
                color: "text-white",
                label: "Count",
                value: formatCount(expenses.length),
              },
              {
                color: "text-amber-400",
                label: "Top Category",
                value: categoryBreakdown[0]?.label || "—",
              },
            ].map((stat) => (
              <div
                className="bg-zinc-900 px-5 py-3.5 text-center"
                key={stat.label}
              >
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3 border-b border-zinc-800 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Breakdown by Category
              </p>
              {categoryBreakdown.map((category, index) => {
                const percentage =
                  totalExpenses > 0
                    ? Math.round((category.amount / totalExpenses) * 100)
                    : 0;
                const color = EXPENSE_COLORS[index % EXPENSE_COLORS.length];

                return (
                  <div key={category.key}>
                    <div className="mb-1 flex items-center justify-between gap-4 text-xs">
                      <span className="flex items-center gap-2 text-zinc-300">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {category.label}
                      </span>
                      <span className="font-semibold text-white">
                        {formatCurrency(category.amount)}{" "}
                        <span className="font-normal text-zinc-500">
                          ({percentage}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: color,
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div>
            <div className="border-b border-zinc-800 px-5 py-3">
              <p className="text-sm font-semibold text-white">
                Tracked Expenses
              </p>
            </div>
            {expenses.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {formatBusinessDate(expense.expenseDate)}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full border border-amber-800 bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-300">
                            {expense.categoryLabel || expense.category}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs text-muted-foreground">
                          <span className="block truncate">
                            {expense.description || "No description"}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-rose-400">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              aria-label={`Edit expense ${expense.id}`}
                              onClick={() => openEditDialog(expense)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              aria-label={`Delete expense ${expense.id}`}
                              onClick={() => openDeleteDialog(expense)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4 text-rose-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
                  <p className="text-xs text-zinc-500">
                    Page {currentPage} of {totalPages} · {expenses.length}{" "}
                    entries
                  </p>
                  <div className="flex gap-1">
                    <Button
                      aria-label="Previous expense page"
                      disabled={currentPage === 1}
                      onClick={() => setPage((value) => Math.max(value - 1, 1))}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Next expense page"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setPage((value) => Math.min(value + 1, totalPages))
                      }
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <AdminEmptyState
                description={`No expenses have been added for ${selectedMonthLabel}.`}
                title="No tracked expenses yet"
              />
            )}
          </div>
        </AdminCard>
      ) : null}

      <ExpenseDialog
        categories={categories}
        mode={dialogMode}
        onClose={closeDialogs}
        onStateChange={setFormState}
        onSubmit={submitExpenseForm}
        open={dialogMode === "create" || dialogMode === "edit"}
        state={formState}
        submitting={submitting}
      />

      <DeleteExpenseDialog
        expense={editingExpense}
        onClose={closeDialogs}
        onConfirm={confirmDelete}
        onReasonChange={setDeleteReason}
        open={dialogMode === "delete"}
        reason={deleteReason}
        submitting={submitting}
      />
    </section>
  );
}
