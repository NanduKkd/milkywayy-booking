import { render, screen } from "@testing-library/react";
import DashboardConnectionsPage from "../page";

const mockAuth = jest.fn();
const mockRedirect = jest.fn();
const mockListActiveOAuthConnections = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (...args) => mockRedirect(...args),
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: (...args) => mockAuth(...args),
}));

jest.mock("@/lib/oauth/consent", () => ({
  listActiveOAuthConnections: (...args) =>
    mockListActiveOAuthConnections(...args),
}));

describe("dashboard connections page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects unauthenticated visitors", async () => {
    mockAuth.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(
      DashboardConnectionsPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("renders active OAuth connections and revoke controls for customers", async () => {
    mockAuth.mockResolvedValue({
      id: 42,
      role: "CUSTOMER",
    });
    mockListActiveOAuthConnections.mockResolvedValue([
      {
        client: {
          clientId: "client-public-123",
          name: "ChatGPT",
        },
        grantedAt: "2026-06-29T12:00:00.000Z",
        id: 1,
        scopes: ["customer:read"],
      },
    ]);

    const page = await DashboardConnectionsPage({
      searchParams: Promise.resolve({
        revoked: "1",
      }),
    });

    render(page);

    expect(mockListActiveOAuthConnections).toHaveBeenCalledWith({
      userId: 42,
    });
    expect(
      screen.getByRole("heading", {
        name: "Connected apps",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(
      screen.getByText(
        "View your account, bookings, invoices, and delivery-file metadata.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Revoke Connection",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The selected OAuth connection was revoked."),
    ).toBeInTheDocument();
  });
});
