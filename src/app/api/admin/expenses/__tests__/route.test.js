import { NextResponse } from "next/server";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { createExpense, listExpenses } from "@/lib/services/expenseAdmin";
import { GET, POST } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findByPk: jest.fn(),
    },
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/services/expenseAdmin", () => ({
  createExpense: jest.fn(),
  listExpenses: jest.fn(),
}));

describe("Admin expenses collection API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    models.User.findByPk.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("lists expenses for an authorized actor", async () => {
    listExpenses.mockResolvedValue({
      items: [{ id: 7 }],
      categories: [],
      filters: {
        rangeStart: "2026-07-01",
        rangeEnd: "2026-07-31",
        category: null,
        includeDeleted: false,
      },
      authorizationMode: "SUPERADMIN_COMPAT",
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/expenses?rangeStart=2026-07-01&rangeEnd=2026-07-31",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(listExpenses).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      filters: {
        rangeStart: "2026-07-01",
        rangeEnd: "2026-07-31",
      },
    });
    expect(data.items).toEqual([{ id: 7 }]);
  });

  it("passes an explicit includeDeleted query value through for validation", async () => {
    listExpenses.mockResolvedValue({ items: [] });

    const response = await GET({
      url: "http://localhost:3000/api/admin/expenses?includeDeleted=false",
    });

    expect(response.status).toBe(200);
    expect(listExpenses).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      filters: { includeDeleted: "false" },
    });
  });

  it("rejects anonymous and non-superadmin access for reads and writes", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await GET({
      url: "http://localhost:3000/api/admin/expenses",
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(listExpenses).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce(null);

    const unauthorizedCreateResponse = await POST({
      json: async () => ({
        amount: "100.00",
        expenseDate: "2026-07-01",
        category: "office",
      }),
    });

    expect(unauthorizedCreateResponse.status).toBe(401);
    expect(createExpense).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });
    models.User.findByPk.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await GET({
      url: "http://localhost:3000/api/admin/expenses",
    });

    expect(forbiddenResponse.status).toBe(403);

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });
    models.User.findByPk.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenCreateResponse = await POST({
      json: async () => ({
        amount: "100.00",
        expenseDate: "2026-07-01",
        category: "office",
      }),
    });

    expect(forbiddenCreateResponse.status).toBe(403);
    expect(createExpense).not.toHaveBeenCalled();
  });

  it("creates an expense and returns 201", async () => {
    createExpense.mockResolvedValue({ id: 9, amount: 100 });

    const response = await POST({
      json: async () => ({
        amount: "100.00",
        expenseDate: "2026-07-01",
        category: "office",
        description: "Printer ink",
        reason: "monthly close",
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(createExpense).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      input: {
        amount: "100.00",
        expenseDate: "2026-07-01",
        category: "office",
        description: "Printer ink",
        reason: "monthly close",
      },
      reason: "monthly close",
    });
    expect(data).toEqual({ id: 9, amount: 100 });
  });

  it("returns validation failures as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    createExpense.mockRejectedValue(
      new Error("Expense amount must be greater than 0"),
    );

    const response = await POST({
      json: async () => ({
        amount: "0",
        expenseDate: "2026-07-01",
        category: "office",
      }),
    });

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Expense amount must be greater than 0" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
