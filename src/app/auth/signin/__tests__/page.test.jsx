import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "../../../../test-utils";
import SignIn from "../page";

describe("SignIn Page", () => {
  it("renders sign in form", () => {
    render(<SignIn />);
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<SignIn />);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/password is required/i),
    ).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    render(<SignIn />);

    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/password must be at least 6 characters/i),
    ).toBeInTheDocument();
  });

  it("submits the form with valid data", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    render(<SignIn />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/email address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText(/password/i), {
        target: { value: "password123" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Sign in data:", {
        email: "test@example.com",
        password: "password123",
      });
    });

    consoleSpy.mockRestore();
  });
});
