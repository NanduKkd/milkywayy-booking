import { auth } from "@/lib/helpers/auth";
import { searchAdminBookingPreparationCustomers } from "@/lib/services/adminBookingPreparation";
import { GET } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/services/adminBookingPreparation", () => ({
  searchAdminBookingPreparationCustomers: jest.fn(),
}));

describe("Admin scheduling calendar customer search route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("returns matching customers for an authorized actor", async () => {
    searchAdminBookingPreparationCustomers.mockResolvedValue([
      { id: 7, displayName: "Ava Agent" },
    ]);

    const response = await GET({
      url: "http://localhost:3000/api/admin/scheduling-calendar/customers?query=ava",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(searchAdminBookingPreparationCustomers).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      query: "ava",
      limit: undefined,
    });
    expect(data.customers).toEqual([{ id: 7, displayName: "Ava Agent" }]);
  });

  it("rejects anonymous and non-superadmin access", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await GET({
      url: "http://localhost:3000/api/admin/scheduling-calendar/customers?query=ava",
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(searchAdminBookingPreparationCustomers).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await GET({
      url: "http://localhost:3000/api/admin/scheduling-calendar/customers?query=ava",
    });

    expect(forbiddenResponse.status).toBe(403);
    expect(searchAdminBookingPreparationCustomers).not.toHaveBeenCalled();
  });
});
