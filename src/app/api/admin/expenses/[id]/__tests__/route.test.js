import { NextResponse } from "next/server";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { deleteExpense, updateExpense } from "@/lib/services/expenseAdmin";
import { DELETE, PUT } from "../route";

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
  deleteExpense: jest.fn(),
  updateExpense: jest.fn(),
}));

describe("Admin expense item API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    models.User.findByPk.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("updates an expense for an authorized actor", async () => {
    updateExpense.mockResolvedValue({ id: 8, amount: 120 });

    const response = await PUT(
      {
        json: async () => ({
          amount: "120.00",
          expenseDate: "2026-07-05",
          category: "software",
          description: "Hosting",
        }),
      },
      { params: Promise.resolve({ id: "8" }) },
    );

    expect(response.status).toBe(200);
    expect(updateExpense).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      expenseId: "8",
      input: {
        amount: "120.00",
        expenseDate: "2026-07-05",
        category: "software",
        description: "Hosting",
      },
      reason: null,
    });
  });

  it("soft deletes an expense with a request reason", async () => {
    deleteExpense.mockResolvedValue({ id: 8, deletedByUserId: 1 });

    const response = await DELETE(
      {
        text: async () => JSON.stringify({ reason: "duplicate entry" }),
      },
      { params: Promise.resolve({ id: "8" }) },
    );

    expect(response.status).toBe(200);
    expect(deleteExpense).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      expenseId: "8",
      reason: "duplicate entry",
    });
  });

  it("maps not found and validation errors to safe statuses", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    updateExpense.mockRejectedValueOnce(new Error("Expense not found"));

    const notFoundResponse = await PUT(
      {
        json: async () => ({
          amount: "120.00",
          expenseDate: "2026-07-05",
          category: "software",
        }),
      },
      { params: Promise.resolve({ id: "8" }) },
    );

    expect(notFoundResponse.status).toBe(404);

    deleteExpense.mockRejectedValueOnce(new Error("Delete reason is required"));

    const badRequestResponse = await DELETE(
      {
        text: async () => JSON.stringify({ reason: "" }),
      },
      { params: Promise.resolve({ id: "8" }) },
    );

    expect(badRequestResponse.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Delete reason is required" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
