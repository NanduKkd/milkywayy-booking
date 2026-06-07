import {
  completeDeliveredBooking,
  requestFileRevision,
} from "@/lib/actions/bookings";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import FileList from "../FileList";

const makeFile = (overrides = {}) => ({
  id: 10,
  type: "Photography",
  label: "Photography",
  deliveryMode: "download",
  status: "UNDER_REVIEW",
  revisionCount: 0,
  reviewDeadlineAt: "2099-12-28T20:00:00.000Z",
  currentVersion: {
    id: 100,
    originalFilename: "living-room.webp",
    url: "https://bucket.example/living-room.webp",
  },
  ...overrides,
});

const makeBooking = (overrides = {}) => ({
  id: 1,
  propertyDetails: { unit: "101", building: "Tower A", community: "Marina" },
  deliveryFinishedAt: null,
  completedAt: null,
  deliveryFiles: [makeFile()],
  ...overrides,
});

describe("customer FileList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestFileRevision.mockResolvedValue({ success: true });
    completeDeliveredBooking.mockResolvedValue({ success: true });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders every physical file with its own counter and deadline", () => {
    render(
      <FileList
        bookings={[
          makeBooking({
            deliveryFiles: [
              makeFile(),
              makeFile({
                id: 11,
                revisionCount: 1,
                currentVersion: {
                  id: 101,
                  originalFilename: "kitchen.webp",
                  url: "https://bucket.example/kitchen.webp",
                },
              }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("living-room.webp")).toBeInTheDocument();
    expect(screen.getByText("kitchen.webp")).toBeInTheDocument();
    expect(screen.getByText("Revision 0/2")).toBeInTheDocument();
    expect(screen.getByText("Revision 1/2")).toBeInTheDocument();
    expect(screen.getAllByText(/review by/i)).toHaveLength(2);
  });

  it("submits a revision against only the selected file", async () => {
    render(<FileList bookings={[makeBooking()]} />);

    fireEvent.click(screen.getByRole("button", { name: /request revision/i }));
    const submit = screen.getByRole("button", { name: /submit revision/i });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/revision details/i), {
      target: { value: "Brighten the kitchen" },
    });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(requestFileRevision).toHaveBeenCalledWith(
        10,
        "Brighten the kitchen",
      );
    });
  });

  it("does not show the old file while a replacement is pending", () => {
    render(
      <FileList
        bookings={[
          makeBooking({
            deliveryFiles: [
              makeFile({
                currentVersion: {
                  id: 100,
                  originalFilename: "old-living-room.webp",
                  url: "https://bucket.example/old-living-room.webp",
                },
                status: "CHANGES_REQUESTED",
                revisionCount: 1,
                reviewDeadlineAt: null,
              }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.queryByText("old-living-room.webp")).not.toBeInTheDocument();
    expect(screen.getByText("No files available yet.")).toBeInTheDocument();
  });

  it("shows other files but not the old file awaiting replacement", () => {
    render(
      <FileList
        bookings={[
          makeBooking({
            deliveryFiles: [
              makeFile({
                status: "CHANGES_REQUESTED",
                currentVersion: {
                  id: 100,
                  originalFilename: "old-living-room.webp",
                  url: "https://bucket.example/old-living-room.webp",
                },
              }),
              makeFile({
                id: 11,
                currentVersion: {
                  id: 101,
                  originalFilename: "kitchen.webp",
                  url: "https://bucket.example/kitchen.webp",
                },
              }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.queryByText("old-living-room.webp")).not.toBeInTheDocument();
    expect(screen.getByText("kitchen.webp")).toBeInTheDocument();
    expect(screen.getByText(/1 awaiting replacement/i)).toBeInTheDocument();
  });

  it("enables booking completion only after admin finalization", async () => {
    const { rerender } = render(<FileList bookings={[makeBooking()]} />);
    expect(
      screen.getByRole("button", { name: /delivery in progress/i }),
    ).toBeDisabled();

    rerender(
      <FileList
        bookings={[
          makeBooking({
            deliveryFinishedAt: "2099-12-28T20:00:00.000Z",
          }),
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /mark complete/i }));

    await waitFor(() => {
      expect(completeDeliveredBooking).toHaveBeenCalledWith(1);
    });
  });
});
