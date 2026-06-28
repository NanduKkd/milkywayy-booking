import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  buildAuthorizationErrorPath,
  buildAuthorizationResumePath,
} from "@/lib/oauth/authorizationResume";
import { AuthProvider, useAuth } from "../auth";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("@/lib/oauth/authorizationResume", () => ({
  buildAuthorizationErrorPath: (errorCode = "login_cancelled") =>
    `/oauth/authorize/error?error=${errorCode}`,
  buildAuthorizationResumePath: (resumeToken) =>
    `/oauth/authorize/resume?resume=${resumeToken}`,
  normalizeAuthorizationErrorPath: (path) =>
    String(path ?? "").startsWith("/oauth/authorize/error?error=")
      ? path
      : null,
  normalizeAuthorizationResumePath: (path) =>
    String(path ?? "").startsWith("/oauth/authorize/resume?resume=")
      ? path
      : null,
}));

jest.mock("@/components/DashboardLoginModal", () => ({
  __esModule: true,
  default: function MockDashboardLoginModal({ isOpen, onClose, onSuccess }) {
    return (
      <div data-open={isOpen ? "true" : "false"} data-testid="login-modal">
        <button type="button" onClick={() => onSuccess({ id: 1 })}>
          Complete Login
        </button>
        <button type="button" onClick={() => onClose("cancel")}>
          Cancel Login
        </button>
      </div>
    );
  },
}));

function LoginHarness({ options }) {
  const { login } = useAuth();

  return (
    <button type="button" onClick={() => login(options)}>
      Start Login
    </button>
  );
}

describe("AuthProvider OAuth resume handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to a validated OAuth resume path after login success", async () => {
    render(
      <AuthProvider initialUser={null}>
        <LoginHarness
          options={{
            nextPath: buildAuthorizationResumePath("resume-token"),
          }}
        />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start Login" }));

    await waitFor(() => {
      expect(screen.getByTestId("login-modal")).toHaveAttribute(
        "data-open",
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Complete Login" }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/oauth/authorize/resume?resume=resume-token",
    );
  });

  it("drops invalid resume paths instead of redirecting externally", async () => {
    render(
      <AuthProvider initialUser={null}>
        <LoginHarness
          options={{
            nextPath: "https://example.com/oauth/authorize/resume?resume=evil",
          }}
        />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start Login" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete Login" }));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it("redirects cancellation to a validated local authorization error path", async () => {
    render(
      <AuthProvider initialUser={null}>
        <LoginHarness
          options={{
            cancelPath: buildAuthorizationErrorPath(),
          }}
        />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start Login" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Login" }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        "/oauth/authorize/error?error=login_cancelled",
      );
    });
  });
});
