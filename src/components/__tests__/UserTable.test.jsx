import { useRouter } from "next/navigation";
import { fireEvent, render, screen } from "../../test-utils";
import UserTable from "../UserTable";

const mockUsers = [
  {
    id: 1,
    fullName: "Admin User",
    email: "admin@example.com",
    phone: "123456789",
    role: "SUPERADMIN",
    createdAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: 2,
    fullName: "Transport User",
    email: "transport@example.com",
    phone: "987654321",
    role: "TRANSPORT",
    createdAt: "2026-07-02T10:00:00.000Z",
  },
];

const mockPagination = {
  page: 1,
  limit: 10,
  total: 2,
  totalPages: 1,
};

describe("UserTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the refreshed account directory table", () => {
    render(<UserTable users={mockUsers} pagination={mockPagination} />);

    expect(
      screen.getByRole("heading", { name: /account directory/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("SUPERADMIN")).toBeInTheDocument();
    expect(screen.getByText("Transport User")).toBeInTheDocument();
    expect(screen.getByText("TRANSPORT")).toBeInTheDocument();
    expect(screen.getByText(/showing 1-2 of 2 accounts/i)).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(
      <UserTable
        users={[]}
        pagination={{ ...mockPagination, total: 0, totalPages: 0 }}
      />,
    );

    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /create a new account to repopulate the current directory/i,
      ),
    ).toBeInTheDocument();
  });

  it("navigates to create user page on button click", () => {
    const router = useRouter();

    render(<UserTable users={mockUsers} pagination={mockPagination} />);

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    expect(router.push).toHaveBeenCalledWith("/admin/users/create");
  });

  it("handles page change", () => {
    const router = useRouter();
    const pagination = { ...mockPagination, totalPages: 5 };

    render(<UserTable users={mockUsers} pagination={pagination} />);

    fireEvent.click(screen.getByText("2"));
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("handles next page click", () => {
    const router = useRouter();
    const pagination = { ...mockPagination, totalPages: 5 };

    render(<UserTable users={mockUsers} pagination={pagination} />);

    fireEvent.click(screen.getByLabelText(/go to next page/i));
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });
});
