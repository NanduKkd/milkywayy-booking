import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import { auth } from "@/lib/helpers/auth";
import { GET } from "../route";

jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/db/models/booking", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfileversion", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({
  findOne: jest.fn(),
}));
jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

describe("delivery file download route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    auth.mockResolvedValue(null);

    const response = await GET({
      url: "http://localhost/api/files/download?fileId=10",
    });

    expect(response.status).toBe(401);
    expect(BookingDeliveryFile.findOne).not.toHaveBeenCalled();
  });

  it("does not expose a file outside the current customer's bookings", async () => {
    auth.mockResolvedValue({ id: 7 });
    BookingDeliveryFile.findOne.mockResolvedValue(null);

    const response = await GET({
      url: "http://localhost/api/files/download?fileId=10",
    });

    expect(response.status).toBe(404);
    expect(BookingDeliveryFile.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            as: "booking",
            where: { userId: 7 },
          }),
        ]),
      }),
    );
  });
});
