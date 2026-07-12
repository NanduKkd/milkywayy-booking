import { useRouter } from "next/navigation";
import { fireEvent, render, screen, waitFor } from "../../test-utils";
import UserTable from "../UserTable";

const mockSetCustomerDisabled = jest.fn();

jest.mock("@/lib/actions/users", () => ({
  setCustomerDisabled: (...args) => mockSetCustomerDisabled(...args),
}));

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
  {
    id: 3,
    fullName: "Active Customer",
    email: "active@example.com",
    phone: "555111222",
    role: "CUSTOMER",
    disabledAt: null,
    createdAt: "2026-07-03T10:00:00.000Z",
  },
  {
    id: 4,
    fullName: "Disabled Customer",
    email: "disabled@example.com",
    phone: "555333444",
    role: "CUSTOMER",
    disabledAt: "2026-07-04T10:00:00.000Z",
    createdAt: "2026-07-04T10:00:00.000Z",
  },
];

const mockPagination = {
  page: 1,
  limit: 10,
  total: 4,
  totalPages: 1,
};

describe("UserTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetCustomerDisabled.mockResolvedValue({ success: true, data: {} });
    jest.spyOn(window, "confirm").mockReturnValue(true);
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
    expect(screen.getByText(/showing 1-4 of 4 accounts/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
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

  it("disables both pagination controls when the directory has one page", () => {
    const router = useRouter();

    render(<UserTable users={mockUsers} pagination={mockPagination} />);

    expect(screen.getByLabelText(/go to previous page/i)).toBeDisabled();
    expect(screen.getByLabelText(/go to next page/i)).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/go to previous page/i));
    fireEvent.click(screen.getByLabelText(/go to next page/i));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("confirms before disabling an active customer", async () => {
    render(<UserTable users={mockUsers} pagination={mockPagination} />);

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("They will not be able to log in"),
    );
    await waitFor(() =>
      expect(mockSetCustomerDisabled).toHaveBeenCalledWith({
        userId: 3,
        disabled: true,
      }),
    );
  });

  it("does not disable a customer when confirmation is cancelled", () => {
    window.confirm.mockReturnValue(false);
    render(<UserTable users={mockUsers} pagination={mockPagination} />);

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    expect(mockSetCustomerDisabled).not.toHaveBeenCalled();
  });

  it("enables a disabled customer without a destructive confirmation", async () => {
    render(<UserTable users={mockUsers} pagination={mockPagination} />);

    fireEvent.click(screen.getByRole("button", { name: "Enable" }));

    await waitFor(() =>
      expect(mockSetCustomerDisabled).toHaveBeenCalledWith({
        userId: 4,
        disabled: false,
      }),
    );
    expect(window.confirm).not.toHaveBeenCalled();
  });
});
