import { Op } from "sequelize";
import models from "@/lib/db/models";
import { getPricingConfig } from "@/lib/helpers/pricing";
import {
  buildDashboardAnalyticsDataWindow,
  buildFinancialDrilldownDataWindow,
  buildFinancialReportDataWindow,
} from "./financialAggregation";

const BOOKING_USER_INCLUDE = [
  {
    model: models.User,
    as: "user",
    attributes: ["id", "fullName", "email", "phone"],
    required: false,
  },
];

function toPlainRecord(record) {
  return typeof record?.get === "function"
    ? record.get({ plain: true })
    : record;
}

function mergeUniqueRecords(recordLists) {
  const recordsById = new Map();

  recordLists.flat().forEach((record) => {
    const plain = toPlainRecord(record);
    const id = plain?.id == null ? null : Number(plain.id);

    if (id == null || recordsById.has(id)) {
      return;
    }

    recordsById.set(id, record);
  });

  return Array.from(recordsById.values());
}

async function loadTransactions(window) {
  const [paidTransactions, refundedTransactions] = await Promise.all([
    models.Transaction.findAll({
      order: [["paidAt", "DESC"]],
      where: {
        paidAt: {
          [Op.gte]: window.rangeStart,
          [Op.lt]: window.rangeEnd,
        },
        status: "success",
      },
    }),
    models.Transaction.findAll({
      order: [["paidAt", "DESC"]],
      where: {
        refundedAmount: {
          [Op.gt]: 0,
        },
        status: "success",
      },
    }),
  ]);

  return mergeUniqueRecords([paidTransactions, refundedTransactions]);
}

async function loadBookings(window, transactions) {
  const transactionIds = transactions
    .map((transaction) => {
      const plain = toPlainRecord(transaction);

      return plain?.id == null ? null : Number(plain.id);
    })
    .filter((id) => Number.isInteger(id));
  const queries = [
    models.Booking.findAll({
      include: BOOKING_USER_INCLUDE,
      where: {
        date: {
          [Op.gte]: window.rangeStartBusinessDate,
          [Op.lt]: window.rangeEndBusinessDateExclusive,
        },
      },
    }),
    models.Booking.findAll({
      include: BOOKING_USER_INCLUDE,
      where: {
        completedAt: {
          [Op.gte]: window.rangeStart,
          [Op.lt]: window.rangeEnd,
        },
      },
    }),
    models.Booking.findAll({
      include: BOOKING_USER_INCLUDE,
      where: {
        cancelledAt: {
          [Op.gte]: window.rangeStart,
          [Op.lt]: window.rangeEnd,
        },
      },
    }),
  ];

  if (transactionIds.length > 0) {
    queries.push(
      models.Booking.findAll({
        include: BOOKING_USER_INCLUDE,
        where: {
          transactionId: {
            [Op.in]: transactionIds,
          },
        },
      }),
    );
  }

  return mergeUniqueRecords(await Promise.all(queries));
}

async function loadExpenses(window) {
  return models.Expense.findAll({
    order: [["expenseDate", "DESC"]],
    where: {
      deletedAt: null,
      expenseDate: {
        [Op.gte]: window.rangeStartBusinessDate,
        [Op.lt]: window.rangeEndBusinessDateExclusive,
      },
    },
  });
}

async function loadLatestActivityMonth() {
  const [latestPayment, latestBooking, latestExpense] = await Promise.all([
    models.Transaction.max("paidAt", { where: { status: "success" } }),
    models.Booking.max("date"),
    models.Expense.max("expenseDate", { where: { deletedAt: null } }),
  ]);
  const latest = [latestPayment, latestBooking, latestExpense]
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return latest ? latest.toISOString().slice(0, 7) : null;
}

async function loadFinancialAnalyticsDependencies(filters, buildWindow) {
  const window = buildWindow(filters);
  const [pricingConfig, transactions, expenses] = await Promise.all([
    getPricingConfig(),
    loadTransactions(window),
    loadExpenses(window),
  ]);
  const bookings = await loadBookings(window, transactions);

  return {
    bookings,
    expenses,
    pricingConfig,
    transactions,
  };
}

export function buildDashboardDependenciesWindow(filters) {
  return buildDashboardAnalyticsDataWindow(filters);
}

export function buildFinancialDrilldownDependenciesWindow(filters) {
  return buildFinancialDrilldownDataWindow(filters);
}

export function buildFinancialReportDependenciesWindow(filters) {
  return buildFinancialReportDataWindow(filters);
}

export async function loadDashboardAnalyticsDependencies(filters) {
  const [dependencies, latestActivityMonth] = await Promise.all([
    loadFinancialAnalyticsDependencies(
      filters,
      buildDashboardAnalyticsDataWindow,
    ),
    loadLatestActivityMonth(),
  ]);

  return { ...dependencies, latestActivityMonth };
}

export function loadFinancialDrilldownDependencies(filters) {
  return loadFinancialAnalyticsDependencies(
    filters,
    buildFinancialDrilldownDataWindow,
  );
}

export function loadFinancialReportDependencies(filters) {
  return loadFinancialAnalyticsDependencies(
    filters,
    buildFinancialReportDataWindow,
  );
}
