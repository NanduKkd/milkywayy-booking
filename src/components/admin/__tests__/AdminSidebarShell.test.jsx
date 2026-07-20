import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminSidebarShell from "../AdminSidebarShell";

const mockLogout = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/contexts/auth", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock("../AdminSidebarNav", () => ({
  __esModule: true,
  default: () => <nav aria-label="Admin navigation">Routes</nav>,
}));

describe("AdminSidebarShell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it("renders the compact brand shell and logs out through the existing flow", async () => {
    render(<AdminSidebarShell />);

    expect(screen.getByText("Admin Portal")).toBeInTheDocument();
    expect(screen.getByText("MILKYWAYY")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Admin navigation" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });
  });
});
