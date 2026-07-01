export const EXPENSE_CATEGORY_DEFINITIONS = [
  { key: "rent", label: "Rent" },
  { key: "payroll", label: "Payroll" },
  { key: "utilities", label: "Utilities" },
  { key: "marketing", label: "Marketing" },
  { key: "transport", label: "Transport" },
  { key: "equipment", label: "Equipment" },
  { key: "software", label: "Software" },
  { key: "contractors", label: "Contractors" },
  { key: "office", label: "Office" },
  { key: "other", label: "Other" },
];

export const EXPENSE_CATEGORY_KEYS = new Set(
  EXPENSE_CATEGORY_DEFINITIONS.map((category) => category.key),
);

export function getExpenseCategoryDefinitions() {
  return EXPENSE_CATEGORY_DEFINITIONS.map((category) => ({ ...category }));
}

export function getExpenseCategoryLabel(categoryKey) {
  const category = EXPENSE_CATEGORY_DEFINITIONS.find(
    (candidate) => candidate.key === categoryKey,
  );

  return category?.label || null;
}
