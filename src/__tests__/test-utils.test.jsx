import { useAuth } from "../lib/contexts/auth";
import { render, screen } from "../test-utils";

const TestComponent = () => {
  const { authState } = useAuth();
  return <div>User: {authState.user ? authState.user.name : "Guest"}</div>;
};

describe("Custom Render", () => {
  it("should wrap components in AuthProvider", () => {
    render(<TestComponent />);
    expect(screen.getByText("User: Guest")).toBeInTheDocument();
  });

  it("should allow passing initial user state", () => {
    const mockUser = { name: "Test User" };
    render(<TestComponent />, { authProviderProps: { initialUser: mockUser } });
    expect(screen.getByText("User: Test User")).toBeInTheDocument();
  });
});
