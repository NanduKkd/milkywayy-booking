import { cancelBooking } from "../../../../lib/actions/bookings";
import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import BookingList from "../BookingList";

// Mock window.confirm
window.confirm = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}));

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

  it("disables reschedule and cancel after the team is dispatched", () => {
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            deliveryNotificationMetadata: {
              teamOnTheWaySentAt: "2099-12-25T08:00:00.000Z",
            },
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /reschedule/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeDisabled();
  });

  it("links booking-level delivery summaries to the Files screen", () => {
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            workflowStatus: "FILES_UPLOADED",
            deliveryFinishedAt: "2099-12-28T20:00:00.000Z",
            deliveryFiles: [
              {
                id: 10,
                type: "Photography",
                status: "UNDER_REVIEW",
                deletedAt: null,
              },
              {
                id: 11,
                type: "Photography",
                status: "CHANGES_REQUESTED",
                deletedAt: null,
              },
            ],
          },
        ]}
      />,
    );

    expect(
      screen.getByText("Available categories: Photography"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 file is awaiting replacement/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /review files/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/files");
    expect(screen.getByText("Under Review")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /request revision/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("101, Tower A, Marina"));
    expect(screen.getAllByText("Under Review")).toHaveLength(2);
  });

  it("lists deduplicated exact visible categories while omitting hidden and replacement-only files", () => {
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            workflowStatus: "FILES_UPLOADED",
            deliveryFiles: [
              { id: 10, type: "Photography", status: "UNDER_REVIEW" },
              { id: 11, type: "Photography", status: "ACCEPTED" },
              { id: 12, type: "Videography", status: "UNDER_REVIEW" },
              {
                id: 13,
                type: "Long Form Video",
                status: "UNDER_REVIEW",
              },
              {
                id: 14,
                type: "Short Form Video",
                status: "CHANGES_REQUESTED",
              },
              { id: 15, type: "Photography", status: "PRIVATE" },
              {
                id: 16,
                type: "Videography",
                status: "UNDER_REVIEW",
                deletedAt: "2026-07-01T00:00:00.000Z",
              },
            ],
          },
        ]}
      />,
    );

    expect(
      screen.getByText(
        "Available categories: Long Form Video · Photography · Videography",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Short Form Video/)).not.toBeInTheDocument();
  });

  it("does not label replacement-only files as available", () => {
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            workflowStatus: "FILES_UPLOADED",
            deliveryFiles: [
              {
                id: 10,
                type: "Photography",
                status: "CHANGES_REQUESTED",
              },
              { id: 11, type: "Videography", status: "PRIVATE" },
            ],
          },
        ]}
      />,
    );

    expect(
      screen.getByText("No files currently available"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 file is awaiting replacement."),
    ).toBeInTheDocument();
  });
});
