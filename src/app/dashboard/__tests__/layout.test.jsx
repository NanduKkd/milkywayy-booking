import { render, screen } from "@testing-library/react";
import DashboardLayout from "../layout";

const mockUsePathname = jest.fn(() => "/dashboard/files");
const mockUseSearchParams = jest.fn(() => new URLSearchParams());

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}));
jest.mock("@/lib/contexts/auth", () => ({
  useAuth: () => ({
    authState: {
      isAuthenticated: true,
      user: { fullName: "Synthetic Customer" },
    },
  }),
}));
jest.mock("@/components/CustomerHeader", () => () => (
  <div>Customer header</div>
));
jest.mock("@/components/StarBackground", () => () => null);
jest.mock("@/components/DashboardAccessGate", () => () => (
  <div>Dashboard access gate</div>
));
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <div>{children}</div>,
}));

describe("dashboard layout navigation", () => {
  it("keeps the canonical files href while labeling the tab Properties", () => {
    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>,
    );

    const propertiesTab = screen.getByRole("link", { name: /Properties/u });
    expect(propertiesTab).toHaveAttribute("href", "/dashboard/files");
    expect(
      screen.queryByRole("link", { name: /^Files$/u }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});
