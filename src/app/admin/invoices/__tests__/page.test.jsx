import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "../../../../test-utils";
import InvoicesPage from "../page";

global.fetch = jest.fn();

const mockInvoices = [
  {
    id: 55,
    invoiceNumber: "MW-2026-0703-001",
    amount: 750,
    status: "success",
    invoiceUrl: "https://bucket.example.com/invoices/55.pdf",
    createdAt: "2026-07-03T10:30:00.000Z",
    user: {
      fullName: "Ava Client",
      email: "ava@example.com",
    },
    bookings: [{ id: 18, bookingCode: "MWB-1018" }],
  },
  {
    id: 56,
    amount: 300,
    status: "pending",
    invoiceUrl: null,
    createdAt: "2026-07-02T08:15:00.000Z",
    user: {
      fullName: "Noah Buyer",
      email: "noah@example.com",
    },
    bookings: [{ id: 19, bookingCode: "MWB-1019" }],
  },
];

describe("Admin Invoices Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the refreshed invoice ledger with filtered totals and unchanged download links", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    expect(screen.getByText(/loading invoices/i)).toBeInTheDocument();
    expect(await screen.findByText("MW-2026-0703-001")).toBeInTheDocument();
    expect(screen.getByText("INV-000056")).toBeInTheDocument();
    expect(screen.getAllByText("AED 1,050")).toHaveLength(2);

    const downloadLink = screen.getByRole("link", {
      name: /download invoice mw-2026-0703-001/i,
    });
    expect(downloadLink).toHaveAttribute(
      "href",
      "/api/invoices/download?transactionId=55",
    );

    fireEvent.change(screen.getByLabelText(/search invoices/i), {
      target: { value: "ava" },
    });

    expect(screen.getByText("MW-2026-0703-001")).toBeInTheDocument();
    expect(screen.queryByText("INV-000056")).not.toBeInTheDocument();
    expect(screen.getAllByText("AED 750")).toHaveLength(3);
    expect(screen.getByText("Showing 1 of 2 invoices")).toBeInTheDocument();
    expect(screen.getByText("1 paid · 0 pending")).toBeInTheDocument();
  });

  it("matches booking-reference searches and shows an empty filtered state", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    expect(await screen.findByText("MW-2026-0703-001")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search invoices/i), {
      target: { value: "MWB-1019" },
    });

    expect(screen.queryByText("MW-2026-0703-001")).not.toBeInTheDocument();
    expect(screen.getByText("INV-000056")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search invoices/i), {
      target: { value: "missing customer" },
    });

    expect(
      screen.getByText(/no invoices match this search/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /try a different invoice number, booking reference, or customer search/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows an inline error state when the fetch fails", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed to fetch invoices" }),
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(/unable to load invoices/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Failed to fetch invoices")).toBeInTheDocument();
  });

  it("shows the live empty state when no invoices exist", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<InvoicesPage />);

    expect(await screen.findByText(/no invoices found/i)).toBeInTheDocument();
    const tablePanel = screen.getByText(/invoice ledger/i).closest("section");
    expect(
      within(tablePanel).getByText(/no invoices found/i),
    ).toBeInTheDocument();
  });
});
