import { Op } from "sequelize";
import models from "@/lib/db/models";
import { getPricingConfig } from "@/lib/helpers/pricing";
import {
  buildDashboardDependenciesWindow,
  buildFinancialReportDependenciesWindow,
  loadDashboardAnalyticsDependencies,
  loadFinancialDrilldownDependencies,
} from "../financialAnalyticsData";

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    Booking: {
      findAll: jest.fn(),
      max: jest.fn(),
    },
    Expense: {
      findAll: jest.fn(),
      max: jest.fn(),
    },
    Transaction: {
      findAll: jest.fn(),
      max: jest.fn(),
    },
    User: { name: "MockUserModel" },
  },
}));

jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

const BOOKING_USER_INCLUDE = [
  {
    model: models.User,
    as: "user",
    attributes: ["id", "fullName", "email", "phone"],
    required: false,
  },
];

describe("financialAnalyticsData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPricingConfig.mockResolvedValue({ Apartment: {} });
    models.Booking.max.mockResolvedValue(null);
    models.Expense.max.mockResolvedValue(null);
    models.Transaction.max.mockResolvedValue(null);
  });

  it("extends dashboard loading to the comparison window and dedupes merged records", async () => {
    const filters = {
      rangeEnd: "2026-06-30",
      rangeStart: "2026-06-01",
    };
    const window = buildDashboardDependenciesWindow(filters);

    expect(window).toEqual({
      rangeEnd: "2026-06-30T20:00:00.000Z",
      rangeEndBusinessDateExclusive: "2026-07-01",
      rangeStart: "2026-05-01T20:00:00.000Z",
      rangeStartBusinessDate: "2026-05-02",
      timezone: "Asia/Dubai",
    });

    models.Transaction.findAll
      .mockResolvedValueOnce([{ id: 11 }])
      .mockResolvedValueOnce([{ id: 11 }, { id: 12 }]);
    models.Booking.findAll
      .mockResolvedValueOnce([{ id: 21 }])
      .mockResolvedValueOnce([{ id: 21 }])
      .mockResolvedValueOnce([{ id: 22 }])
      .mockResolvedValueOnce([{ id: 23 }]);
    models.Expense.findAll.mockResolvedValue([{ id: 31 }]);

    const result = await loadDashboardAnalyticsDependencies(filters);

    expect(models.Transaction.findAll).toHaveBeenNthCalledWith(1, {
      order: [["paidAt", "DESC"]],
      where: {
        paidAt: {
          [Op.gte]: window.rangeStart,
          [Op.lt]: window.rangeEnd,
        },
        status: "success",
      },
    });
    expect(models.Transaction.findAll).toHaveBeenNthCalledWith(2, {
      order: [["paidAt", "DESC"]],
      where: {
        refundedAmount: {
          [Op.gt]: 0,
        },
        status: "success",
      },
    });
    expect(models.Booking.findAll).toHaveBeenNthCalledWith(1, {
      include: BOOKING_USER_INCLUDE,
      where: {
        date: {
          [Op.gte]: window.rangeStartBusinessDate,
          [Op.lt]: window.rangeEndBusinessDateExclusive,
        },
      },
    });
    expect(models.Booking.findAll).toHaveBeenNthCalledWith(4, {
      include: BOOKING_USER_INCLUDE,
      where: {
        transactionId: {
          [Op.in]: [11, 12],
        },
      },
    });
    expect(models.Expense.findAll).toHaveBeenCalledWith({
      order: [["expenseDate", "DESC"]],
      where: {
        deletedAt: null,
        expenseDate: {
          [Op.gte]: window.rangeStartBusinessDate,
          [Op.lt]: window.rangeEndBusinessDateExclusive,
        },
      },
    });
    expect(result.transactions.map((transaction) => transaction.id)).toEqual([
      11, 12,
    ]);
    expect(result.bookings.map((booking) => booking.id)).toEqual([21, 22, 23]);
    expect(result.expenses).toEqual([{ id: 31 }]);
    expect(result.pricingConfig).toEqual({ Apartment: {} });
    expect(result.latestActivityMonth).toBeNull();
  });

  it("returns the latest database activity month for empty-range recovery", async () => {
    models.Transaction.findAll.mockResolvedValue([]);
    models.Booking.findAll.mockResolvedValue([]);
    models.Expense.findAll.mockResolvedValue([]);
    models.Transaction.max.mockResolvedValue("2026-03-23T10:19:53.839Z");
    models.Booking.max.mockResolvedValue("2026-03-31");

    const result = await loadDashboardAnalyticsDependencies({
      rangeEnd: "2026-07-31",
      rangeStart: "2026-07-01",
    });

    expect(result.latestActivityMonth).toBe("2026-03");
  });

  it("expands report loading to cover the six-month comparison window", () => {
    expect(
      buildFinancialReportDependenciesWindow({
        groupBy: "week",
        rangeEnd: "2026-06-20",
        rangeStart: "2026-06-10",
      }),
    ).toEqual({
      rangeEnd: "2026-06-30T20:00:00.000Z",
      rangeEndBusinessDateExclusive: "2026-07-01",
      rangeStart: "2025-12-31T20:00:00.000Z",
      rangeStartBusinessDate: "2026-01-01",
      timezone: "Asia/Dubai",
    });
  });

  it("keeps drill-down loading scoped to the active range when no linked transactions exist", async () => {
    const filters = {
      metricKey: "netRevenue",
      rangeEnd: "2026-06-30",
      rangeStart: "2026-06-01",
    };

    models.Transaction.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    models.Booking.findAll
      .mockResolvedValueOnce([{ id: 41 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    models.Expense.findAll.mockResolvedValue([]);

    await loadFinancialDrilldownDependencies(filters);

    expect(models.Booking.findAll).toHaveBeenCalledTimes(3);
    expect(models.Booking.findAll).toHaveBeenNthCalledWith(1, {
      include: BOOKING_USER_INCLUDE,
      where: {
        date: {
          [Op.gte]: "2026-06-01",
          [Op.lt]: "2026-07-01",
        },
      },
    });
    expect(models.Transaction.findAll).toHaveBeenNthCalledWith(1, {
      order: [["paidAt", "DESC"]],
      where: {
        paidAt: {
          [Op.gte]: "2026-05-31T20:00:00.000Z",
          [Op.lt]: "2026-06-30T20:00:00.000Z",
        },
        status: "success",
      },
    });
  });
});
