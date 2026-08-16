import { render, screen } from "../../../../test-utils";
import WalletView from "../WalletView";

const mockData = {
  balance: 100,
  transactions: [
    {
      id: 1,
      amount: 50,
      status: "active",
      createdAt: "2025-12-01T10:00:00.000Z",
      creditExpiresAt: "2026-12-01T10:00:00.000Z",
    },
    {
      id: 2,
      amount: -20,
      status: "active",
      createdAt: "2025-12-05T10:00:00.000Z",
    },
    {
      id: 3,
      amount: 30,
      status: "pending",
      createdAt: "2025-12-10T10:00:00.000Z",
    },
  ],
};

describe("WalletView", () => {
  it("renders wallet balance", () => {
    render(<WalletView data={mockData} />);
    expect(screen.getByText(/AED 100/i)).toBeInTheDocument();
  });

  it("renders transaction list", () => {
    render(<WalletView data={mockData} />);
    // There are multiple "Credit Added" labels, so we can check if they exist
    expect(screen.getAllByText("Credit Added")).toHaveLength(2);
    expect(screen.getByText("Credit Used")).toBeInTheDocument();
    expect(screen.getByText("+50")).toBeInTheDocument();
    expect(screen.getByText("-20")).toBeInTheDocument();
  });

  it("renders empty state when no transactions", () => {
    render(<WalletView data={{ balance: 0, transactions: [] }} />);
    expect(
      screen.getByText(/no wallet transactions found/i),
    ).toBeInTheDocument();
  });

  it("shows pending status and message", () => {
    render(<WalletView data={mockData} />);
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(
      screen.getByText(/Activates on shoot completion/i),
    ).toBeInTheDocument();
  });

  it("shows expiration date if present", () => {
    render(<WalletView data={mockData} />);
    expect(screen.getByText(/Expires:/i)).toBeInTheDocument();
  });
});
