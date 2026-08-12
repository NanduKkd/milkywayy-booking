const mockRequireSuperadminActor = jest.fn();
const mockFindAll = jest.fn();
const mockCreate = jest.fn();
const mockFindByPk = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn((callback) => callback({ id: "transaction" }));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
  getAuthorizationErrorStatus: (error) => error.authorizationStatus ?? null,
}));

jest.mock("@/lib/db/models/review", () => ({
  findAll: (...args) => mockFindAll(...args),
  create: (...args) => mockCreate(...args),
  findByPk: (...args) => mockFindByPk(...args),
  update: (...args) => mockUpdate(...args),
}));

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: (...args) => mockTransaction(...args),
  },
}));

import { DELETE, PUT } from "../[id]/route";
import { PATCH } from "../reorder/route";
import { GET, POST } from "../route";

function authorizationFailure(message, status) {
  return Object.assign(new Error(message), { authorizationStatus: status });
}

describe("admin review route authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
  });

  it.each([
    ["list", () => GET()],
    ["create", (request) => POST(request)],
    [
      "update",
      (request) => PUT(request, { params: Promise.resolve({ id: "1" }) }),
    ],
    [
      "delete",
      (request) => DELETE(request, { params: Promise.resolve({ id: "1" }) }),
    ],
    ["reorder", (request) => PATCH(request)],
  ])(
    "rejects anonymous %s access before request or model work",
    async (_, route) => {
      const request = { json: jest.fn() };
      mockRequireSuperadminActor.mockRejectedValue(
        authorizationFailure("Unauthorized", 401),
      );

      const response = await route(request);

      expect(response.status).toBe(401);
      expect(request.json).not.toHaveBeenCalled();
      expect(mockFindAll).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockFindByPk).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    },
  );

  it("returns forbidden for a non-Super Admin database actor", async () => {
    mockRequireSuperadminActor.mockRejectedValue(
      authorizationFailure("Forbidden", 403),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("preserves authorized review listing", async () => {
    const reviews = [{ id: 1, name: "Client" }];
    mockFindAll.mockResolvedValue(reviews);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBe(reviews);
  });

  it("preserves authorized review creation", async () => {
    const review = { id: 2, name: "Client" };
    mockCreate.mockResolvedValue(review);
    const request = {
      json: jest.fn().mockResolvedValue({
        name: "Client",
        role: "Agent",
        company: "Company",
        quote: "Excellent",
      }),
    };

    const response = await POST(request);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toBe(review);
  });

  it("preserves authorized review updates and deletion", async () => {
    const review = {
      id: 1,
      name: "Before",
      update: jest.fn().mockImplementation(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
      destroy: jest.fn(),
    };
    mockFindByPk.mockResolvedValue(review);

    const updateResponse = await PUT(
      { json: jest.fn().mockResolvedValue({ name: "After" }) },
      { params: Promise.resolve({ id: "1" }) },
    );
    const deleteResponse = await DELETE(
      {},
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(updateResponse.status).toBe(200);
    expect(review.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "After" }),
    );
    expect(deleteResponse.status).toBe(200);
    expect(review.destroy).toHaveBeenCalledTimes(1);
  });

  it("preserves authorized review reordering", async () => {
    const response = await PATCH({
      json: jest.fn().mockResolvedValue([{ id: 1, order: 2 }]),
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      { order: 2 },
      {
        where: { id: 1 },
        transaction: { id: "transaction" },
      },
    );
  });
});
