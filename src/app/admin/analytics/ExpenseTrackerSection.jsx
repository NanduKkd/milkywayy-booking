"use client";

import {
  AlertCircle,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <div aria-label="Loading expense tracker" className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-white/10 bg-white/[0.04]" />
    </div>
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Save a finance expense with the same month filter used by the live
            reports.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-muted-foreground">
              Amount (AED)
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
            </label>

            <label className="space-y-2 text-sm text-muted-foreground">
              Expense date
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
            </label>
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

          <label className="space-y-2 text-sm text-muted-foreground">
            Description
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
          </label>

          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? "Saving..." : actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete expense</DialogTitle>
          <DialogDescription>
            This removes the expense from live reporting by soft deletion and
            requires a reason for the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-foreground">
            {expense?.categoryLabel || expense?.category || "Expense"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatBusinessDate(expense?.expenseDate)} · {formatCurrency(expense?.amount)}
          </p>
          {expense?.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {expense.description}
            </p>
          ) : null}
        </div>

        <label className="space-y-2 text-sm text-muted-foreground">
          Delete reason
          <Textarea
            aria-label="Delete reason"
            maxLength={500}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Why should this expense be removed?"
            required
            value={reason}
          />
        </label>

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
      </DialogContent>
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
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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

      toast.success(dialogMode === "edit" ? "Expense updated" : "Expense created");
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
    <section className="space-y-4" aria-labelledby="expense-tracker-heading">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Expenses
          </p>
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="expense-tracker-heading"
          >
            Expense Tracker
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Logged expenses for {selectedMonthLabel}, with live totals feeding
            the finance KPIs above.
          </p>
        </div>

        <Button
          className="rounded-xl"
          disabled={loading || categories.length === 0}
          onClick={openCreateDialog}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add expense
        </Button>
      </div>

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <Card className="rounded-2xl border-red-400/20 bg-red-500/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-200">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-xl">Expense tracker unavailable</CardTitle>
            </div>
            <CardDescription className="text-red-100/80">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onDataChanged} type="button" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl border-white/10 bg-card/70">
              <CardHeader>
                <CardDescription>Total tracked expenses</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(totalExpenses)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {formatCount(expenses.length)} expense entries in {selectedMonthLabel}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-card/70 lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-emerald-300" />
                  <CardTitle className="text-xl">Category Breakdown</CardTitle>
                </div>
                <CardDescription>
                  Expense totals grouped by the configured finance categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryBreakdown.length > 0 ? (
                  categoryBreakdown.map((category) => (
                    <div
                      key={category.key}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {category.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCount(category.count)} entries
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No expenses have been tracked for this month yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-white/10 bg-card/70">
            <CardHeader>
              <CardTitle className="text-xl">Tracked Expenses</CardTitle>
              <CardDescription>
                Add, revise, or remove monthly expense entries with audit-safe
                soft deletion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
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
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {formatBusinessDate(expense.expenseDate)}
                        </TableCell>
                        <TableCell>{expense.categoryLabel || expense.category}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {expense.description || "No description"}
                        </TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              aria-label={`Edit expense ${expense.id}`}
                              onClick={() => openEditDialog(expense)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              aria-label={`Delete expense ${expense.id}`}
                              onClick={() => openDeleteDialog(expense)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No expenses have been added for {selectedMonthLabel}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
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
