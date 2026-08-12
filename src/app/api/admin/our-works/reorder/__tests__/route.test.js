const mockRequireSuperadminActor = jest.fn();

import { sequelize } from "../../../../../../lib/db/db";
import OurWork from "../../../../../../lib/db/models/ourwork";
import { PATCH } from "../route";

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// Mock Database Models
jest.mock("../../../../../../lib/db/models/ourwork", () => ({
  update: jest.fn(),
}));

// Mock Sequelize Transaction
jest.mock("../../../../../../lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback()),
  },
}));

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
  getAuthorizationErrorStatus: (error) => error.authorizationStatus ?? null,
}));

describe("Admin OurWorks Reorder API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
  });

  it("rejects anonymous reordering before request or transaction work", async () => {
    const request = { json: jest.fn() };
    mockRequireSuperadminActor.mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { authorizationStatus: 401 }),
    );

    const response = await PATCH(request);

    expect(response.status).toBe(401);
    expect(request.json).not.toHaveBeenCalled();
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(OurWork.update).not.toHaveBeenCalled();
  });

  it("updates the order of multiple items", async () => {
    const mockPayload = [
      { id: 1, order: 2 },
      { id: 2, order: 1 },
    ];

    const request = {
      json: async () => mockPayload,
    };
    const response = await PATCH(request);
    const data = await response.json();

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(OurWork.update).toHaveBeenCalledTimes(2);
    expect(data.message).toBeDefined();
  });

  it("returns 400 if payload is not an array", async () => {
    const request = {
      json: async () => ({ id: 1, order: 2 }),
    };
    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });
});
