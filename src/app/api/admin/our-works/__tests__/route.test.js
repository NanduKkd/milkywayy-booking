const mockRequireSuperadminActor = jest.fn();

import OurWork from "../../../../../lib/db/models/ourwork";
import { POST } from "../route";

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
jest.mock("../../../../../lib/db/models/ourwork", () => ({
  create: jest.fn(),
}));

jest.mock("@/lib/helpers/authorization", () => ({
  requireSuperadminActor: (...args) => mockRequireSuperadminActor(...args),
  getAuthorizationErrorStatus: (error) => error.authorizationStatus ?? null,
}));

describe("Admin OurWorks API Route - POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadminActor.mockResolvedValue({
      id: 1,
      role: "SUPERADMIN",
    });
  });

  it.each([
    ["Unauthorized", 401],
    ["Forbidden", 403],
  ])("returns %s before reading the request body", async (message, status) => {
    const request = { json: jest.fn() };
    mockRequireSuperadminActor.mockRejectedValue(
      Object.assign(new Error(message), { authorizationStatus: status }),
    );

    const response = await POST(request);

    expect(response.status).toBe(status);
    expect(request.json).not.toHaveBeenCalled();
    expect(OurWork.create).not.toHaveBeenCalled();
  });

  it("creates a new work entry on success", async () => {
    const mockPayload = {
      title: "New Work",
      subtitle: "New Subtitle",
      type: "IMAGE",
      mediaContent: "http://example.com/image.jpg",
    };
    OurWork.create.mockResolvedValue({ id: 1, ...mockPayload });

    const request = {
      json: async () => mockPayload,
    };
    const response = await POST(request);
    const data = await response.json();

    expect(data.id).toBe(1);
    expect(OurWork.create).toHaveBeenCalledWith(
      expect.objectContaining(mockPayload),
    );
    expect(response.status).toBe(201);
  });

  it("creates a new work entry with multiple images on success", async () => {
    const mockPayload = {
      title: "New Work Gallery",
      subtitle: "New Subtitle",
      type: "IMAGE",
      mediaContent: ["http://example.com/1.jpg", "http://example.com/2.jpg"],
    };
    OurWork.create.mockResolvedValue({ id: 2, ...mockPayload });

    const request = {
      json: async () => mockPayload,
    };
    const response = await POST(request);
    const data = await response.json();

    expect(data.id).toBe(2);
    expect(data.mediaContent).toEqual(mockPayload.mediaContent);
    expect(OurWork.create).toHaveBeenCalledWith(
      expect.objectContaining(mockPayload),
    );
    expect(response.status).toBe(201);
  });

  it("returns 400 if required fields are missing", async () => {
    const request = {
      json: async () => ({ title: "Incomplete" }),
    };
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
