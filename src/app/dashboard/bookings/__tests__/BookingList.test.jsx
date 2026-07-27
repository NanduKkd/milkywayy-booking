import { cancelBooking } from "../../../../lib/actions/bookings";
import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import BookingList from "../BookingList";

// Mock window.confirm
window.confirm = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}));
jest.mock("../../files/CreatePropertyShareDialog", () => ({
  __esModule: true,
  default: ({ property, onClose }) => (
    <div role="dialog" aria-label="Create property share">
      <span>{property.bookingTitle}</span>
      <button type="button" onClick={onClose}>
        Close share dialog
      </button>
    </div>
  ),
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
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    });
    // Default mock implementation
    cancelBooking.mockResolvedValue({ success: true });
  });

  it("renders list of bookings", () => {
    render(<BookingList bookings={mockBookings} />);
    expect(screen.getByText("Tower A — 101")).toBeInTheDocument();
    expect(screen.getByText("Photography")).toBeInTheDocument();
  });

  it("uses the reference card hierarchy, progress labels, and scheduled actions", () => {
    render(<BookingList bookings={mockBookings} />);

    expect(screen.getByLabelText("Booking progress")).toBeInTheDocument();
    expect(screen.getByText("Files Uploaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reschedule" })).toHaveClass(
      "min-h-11",
    );
    expect(screen.getByRole("button", { name: /^cancel$/i })).toHaveClass(
      "text-red-400",
    );
  });

  it("uses the reference vertical stepper below 900px or below 560px tall", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 899,
    });
    render(<BookingList bookings={mockBookings} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Booking progress")).toHaveClass("flex-col");
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 559,
    });
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(screen.getByLabelText("Booking progress")).toHaveClass("flex-col");
    });
  });

  it("keeps 900 by 560 on the desktop stepper boundary", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 560,
    });
    render(<BookingList bookings={mockBookings} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Booking progress")).toHaveAttribute(
        "data-layout",
        "horizontal",
      );
    });
  });

  it("renders the exact active and completed step treatment for every workflow state", () => {
    const workflowStates = [
      "SHOOT_BOOKED",
      "SHOOT_DONE",
      "EDITING",
      "FILES_UPLOADED",
      "PROJECT_COMPLETED",
    ];
    render(
      <BookingList
        bookings={workflowStates.map((workflowStatus, index) => ({
          ...mockBookings[0],
          id: index + 1,
          date: `2099-12-${25 - index}`,
          workflowStatus,
          status:
            workflowStatus === "PROJECT_COMPLETED" ? "COMPLETED" : "CONFIRMED",
        }))}
      />,
    );

    const trackers = screen.getAllByLabelText("Booking progress");
    expect(trackers).toHaveLength(5);
    trackers.forEach((tracker, currentIndex) => {
      expect(tracker).toHaveAttribute(
        "data-current-status",
        workflowStates[currentIndex],
      );
      const nodes = [...tracker.querySelectorAll("[data-step-state]")];
      expect(nodes).toHaveLength(5);
      nodes.forEach((node, stepIndex) => {
        expect(node).toHaveAttribute(
          "data-step-state",
          currentIndex === 4
            ? "completed"
            : stepIndex < currentIndex
              ? "completed"
              : stepIndex === currentIndex
                ? "active"
                : "pending",
        );
      });
    });
  });

  it("uses Editing as the display-only step for partial delivery", () => {
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            shootDetails: {
              services: ["Photography", "360° Tour"],
            },
            workflowStatus: "FILES_UPLOADED",
            deliveryFinishedAt: null,
            deliveryFiles: [
              {
                id: 10,
                type: "Photography",
                status: "UNDER_REVIEW",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Booking progress")).toHaveAttribute(
      "data-current-status",
      "EDITING",
    );
    expect(screen.getByText("● Partially delivered")).toBeInTheDocument();
    expect(
      screen.getByText("◐ 360° tour in editing — 48–72h"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^cancel$/i })).toBeNull();
  });

  it("lets cancellation override stale completed workflow state", () => {
    render(
      <BookingList
        bookings={[
          {
            ...mockBookings[0],
            status: "CANCELLED",
            workflowStatus: "PROJECT_COMPLETED",
          },
        ]}
      />,
    );

    expect(screen.getByText("● Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Booking Cancelled")).toBeInTheDocument();
    expect(screen.queryByLabelText("Booking progress")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^cancel$/i })).toBeNull();
  });

  it("lets an eligible delivered booking open Create Share Link directly", () => {
    const deliveredBooking = {
      ...mockBookings[0],
      workflowStatus: "FILES_UPLOADED",
      deliveryFiles: [{ id: 10, type: "Photography", status: "UNDER_REVIEW" }],
    };
    render(
      <BookingList
        bookings={[deliveredBooking]}
        propertySharing={{
          eligibleProperties: [
            { id: 1, bookingTitle: "Tower A — 101", media: [] },
          ],
          shares: [],
          savedContacts: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create share link/i }));
    expect(
      screen.getByRole("dialog", { name: "Create property share" }),
    ).toBeInTheDocument();
  });

  it("keeps Create Share Link as a direct, injectable booking action", () => {
    const onCreateShareLink = jest.fn();
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
                status: "UNDER_REVIEW",
              },
            ],
          },
        ]}
        onCreateShareLink={onCreateShareLink}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create share link/i }));
    expect(onCreateShareLink).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
    );
  });

  it("renders empty state when no bookings", () => {
    render(<BookingList bookings={[]} />);
    expect(screen.getByText(/no bookings found/i)).toBeInTheDocument();
  });

  it("opens dialog when booking is clicked", () => {
    render(<BookingList bookings={mockBookings} />);
    fireEvent.click(screen.getByText("Tower A — 101"));
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

  it("opens the shared authenticated delivery modal from booking summaries", () => {
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
      screen.getByText("Files ready for review: Photography"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 file is awaiting replacement/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Editing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /download files/i }));
    expect(
      screen.getByRole("heading", { name: /download files/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Replacement pending")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /request review/i }),
    ).not.toBeInTheDocument();
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
        "Files ready for review: Long Form Video · Photography · Videography",
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
