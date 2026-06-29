import { cleanupOAuthArtifacts } from "@/lib/oauth/cleanup";
import { POST } from "../route";

jest.mock("@/lib/oauth/cleanup", () => ({
  cleanupOAuthArtifacts: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

const createRequest = ({ authorization = null, cronSecret = null } = {}) => ({
  headers: {
    get: (name) => {
      const normalizedName = name.toLowerCase();
      if (normalizedName === "authorization") {
        return authorization;
      }
      if (normalizedName === "x-cron-secret") {
        return cronSecret;
      }
      return null;
    },
  },
});

describe("oauth cleanup route", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("rejects requests when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "CRON_SECRET is not configured",
    });
  });

  it("rejects an invalid bearer secret", async () => {
    const response = await POST(
      createRequest({ authorization: "Bearer wrong-secret" }),
    );

    expect(response.status).toBe(401);
    expect(cleanupOAuthArtifacts).not.toHaveBeenCalled();
  });

  it("accepts the x-cron-secret header for authorized cleanup workers", async () => {
    cleanupOAuthArtifacts.mockResolvedValue({ totalDeleted: 4 });

    const response = await POST(createRequest({ cronSecret: "test-secret" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ totalDeleted: 4 });
  });
});
