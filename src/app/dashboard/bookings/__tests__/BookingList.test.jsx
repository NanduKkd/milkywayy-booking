import {
  cancelBooking,
  completeDeliveredBooking,
  requestBookingRevision,
} from "../../../../lib/actions/bookings";
import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import BookingList from "../BookingList";

// Mock window.confirm
window.confirm = jest.fn();

const mockBookings = [
  {
    id: 1,
    date: "2099-12-25",
    slot: 1,
    propertyDetails: { unit: "101", building: "Tower A", community: "Marina" },
    shootDetails: { services: ["Photography"] },
    cancelledAt: null,
    completedAt: null,
    transaction: { amount: 500 },
  },
];

describe("BookingList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    cancelBooking.mockResolvedValue({ success: true });
  });

  it("renders list of bookings", () => {
    render(<BookingList bookings={mockBookings} />);
    expect(screen.getByText("101, Tower A, Marina")).toBeInTheDocument();
    expect(screen.getByText("Photography")).toBeInTheDocument();
  });

  it("renders empty state when no bookings", () => {
    render(<BookingList bookings={[]} />);
    expect(screen.getByText(/no bookings found/i)).toBeInTheDocument();
  });

  it("opens dialog when booking is clicked", () => {
    render(<BookingList bookings={mockBookings} />);
    fireEvent.click(screen.getByText("101, Tower A, Marina"));
    expect(screen.getByText(/booking details #1/i)).toBeInTheDocument();
  });

  it("calls cancelBooking when cancel button is clicked and confirmed", async () => {
    render(<BookingList bookings={mockBookings} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm cancel/i }));

    await waitFor(() => {
      expect(cancelBooking).toHaveBeenCalledWith(1);
    });
  });

  it("does not call cancelBooking if modal is dismissed", async () => {
    render(<BookingList bookings={mockBookings} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /keep booking/i }));

    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("lets the customer complete files under review", async () => {
    completeDeliveredBooking.mockResolvedValue({ success: true });
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            workflowStatus: "FILES_UPLOADED",
            reviewDeadlineAt: "2099-12-28T20:00:00.000Z",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /mark complete/i }));

    await waitFor(() => {
      expect(completeDeliveredBooking).toHaveBeenCalledWith(1);
    });
  });

  it("shows a customer-friendly review deadline", () => {
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            workflowStatus: "FILES_UPLOADED",
            reviewDeadlineAt: "2099-12-28T20:00:00.000Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByText(/december 29 at midnight \(dubai time\)/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/gmt\+4/i)).not.toBeInTheDocument();
  });

  it("requires revision details before submitting", async () => {
    requestBookingRevision.mockResolvedValue({ success: true });
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            workflowStatus: "FILES_UPLOADED",
            revisionCount: 0,
            reviewDeadlineAt: "2099-12-28T20:00:00.000Z",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /request revision/i }));
    const submit = screen.getByRole("button", { name: /submit revision/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/revision details/i), {
      target: { value: "Please brighten the kitchen" },
    });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(requestBookingRevision).toHaveBeenCalledWith(
        1,
        "Please brighten the kitchen",
      );
    });
  });
});
