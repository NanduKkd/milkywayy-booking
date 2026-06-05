import { autoCompleteEligibleBookings } from "@/lib/services/bookingWorkflow";
import { POST } from "../route";

jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/services/bookingWorkflow", () => ({
  autoCompleteEligibleBookings: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

const createRequest = (authorization) => ({
  headers: {
    get: (name) =>
      name.toLowerCase() === "authorization" ? authorization : null,
  },
});

describe("booking auto-completion route", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("rejects an invalid secret", async () => {
    const response = await POST(createRequest("Bearer wrong"));

    expect(response.status).toBe(401);
    expect(autoCompleteEligibleBookings).not.toHaveBeenCalled();
  });

  it("runs auto-completion for an authorized worker", async () => {
    autoCompleteEligibleBookings.mockResolvedValue({ completedCount: 2 });

    const response = await POST(createRequest("Bearer test-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ completedCount: 2 });
  });
});
