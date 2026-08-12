const mockRequireSuperadminActor = jest.fn();

import OurWork from "../../../../../../lib/db/models/ourwork";
import { DELETE, PUT } from "../route";

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
  findByPk: jest.fn(),
}));

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
  getAuthorizationErrorStatus: (error) => error.authorizationStatus ?? null,
}));

describe("Admin OurWorks ID API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
  });

  it.each([
    [
      "update",
      (request) => PUT(request, { params: Promise.resolve({ id: "1" }) }),
    ],
    [
      "delete",
      (request) => DELETE(request, { params: Promise.resolve({ id: "1" }) }),
    ],
  ])("rejects anonymous %s access before model work", async (_, route) => {
    const request = { json: jest.fn() };
    mockRequireSuperadminActor.mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { authorizationStatus: 401 }),
    );

    const response = await route(request);

    expect(response.status).toBe(401);
    expect(request.json).not.toHaveBeenCalled();
    expect(OurWork.findByPk).not.toHaveBeenCalled();
  });

  describe("PUT", () => {
    it("updates an existing work entry", async () => {
      const mockWork = {
        id: 1,
        title: "Old Title",
        update: jest.fn().mockImplementation(function (data) {
          Object.assign(this, data);
          return Promise.resolve(this);
        }),
      };
      OurWork.findByPk.mockResolvedValue(mockWork);

      const request = {
        json: async () => ({ title: "Updated" }),
      };
      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(OurWork.findByPk).toHaveBeenCalledWith("1");
      expect(mockWork.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Updated" }),
      );
      expect(data.title).toBe("Updated");
    });

    it("updates an existing work entry with multiple images", async () => {
      const mockWork = {
        id: 1,
        title: "Title",
        mediaContent: "old.jpg",
        update: jest.fn().mockImplementation(function (data) {
          Object.assign(this, data);
          return Promise.resolve(this);
        }),
      };
      OurWork.findByPk.mockResolvedValue(mockWork);

      const multiImages = ["1.jpg", "2.jpg"];
      const request = {
        json: async () => ({ mediaContent: multiImages }),
      };
      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(mockWork.update).toHaveBeenCalledWith(
        expect.objectContaining({ mediaContent: multiImages }),
      );
      expect(data.mediaContent).toEqual(multiImages);
    });

    it("returns 404 if not found", async () => {
      OurWork.findByPk.mockResolvedValue(null);
      const request = { json: async () => ({}) };
      const response = await PUT(request, {
        params: Promise.resolve({ id: "999" }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("deletes an existing work entry", async () => {
      const mockWork = { id: 1, destroy: jest.fn() };
      OurWork.findByPk.mockResolvedValue(mockWork);

      const response = await DELETE(
        {},
        { params: Promise.resolve({ id: "1" }) },
      );

      expect(OurWork.findByPk).toHaveBeenCalledWith("1");
      expect(mockWork.destroy).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("returns 404 if not found", async () => {
      OurWork.findByPk.mockResolvedValue(null);
      const response = await DELETE(
        {},
        { params: Promise.resolve({ id: "999" }) },
      );
      expect(response.status).toBe(404);
    });
  });
});
