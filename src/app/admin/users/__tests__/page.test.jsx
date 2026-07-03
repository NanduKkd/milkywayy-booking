import { render, screen } from "@testing-library/react";
import UserManagement from "../page";

const mockGetSessionUser = jest.fn();
const mockFindAndCountAll = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/helpers/auth", () => ({
  getSessionUser: (...args) => mockGetSessionUser(...args),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findAndCountAll: (...args) => mockFindAndCountAll(...args),
    },
  },
}));

jest.mock("@/components/UserTable", () => ({
  __esModule: true,
  default: function MockUserTable({ users, pagination }) {
    return (
      <div
        data-testid="user-table"
        data-page={pagination.page}
        data-total={pagination.total}
      >
        {users.length} users
      </div>
    );
  },
}));

describe("UserManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects anonymous visitors to the admin login route", async () => {
    const { redirect } = await import("next/navigation");

    mockGetSessionUser.mockResolvedValue(null);

    await UserManagement({ searchParams: Promise.resolve({}) });

    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("renders the refreshed customers shell with the live directory summary", async () => {
    mockGetSessionUser.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    mockFindAndCountAll.mockResolvedValue({
      count: 14,
      rows: [
        {
          toJSON: () => ({
            id: 7,
            fullName: "Ava Client",
            email: "ava@example.com",
            phone: "12345",
            role: "CUSTOMER",
          }),
        },
        {
          toJSON: () => ({
            id: 8,
            fullName: "Ops Lead",
            email: "ops@example.com",
            phone: "54321",
            role: "SUPERADMIN",
          }),
        },
      ],
    });

    render(
      await UserManagement({
        searchParams: Promise.resolve({ page: "2", limit: "2" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: /customers/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/total records/i)).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("3-4")).toBeInTheDocument();
    expect(screen.getByTestId("user-table")).toHaveAttribute("data-page", "2");
    expect(mockFindAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 2,
        offset: 2,
      }),
    );
  });
});
