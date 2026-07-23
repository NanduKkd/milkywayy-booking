import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  completeDeliveredBooking,
  requestFileRevision,
} from "@/lib/actions/bookings";
import FileList from "../FileList";

const mockRefresh = jest.fn();
const mockPropertyShareDialog = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

jest.mock("@/lib/actions/bookings", () => ({
  completeDeliveredBooking: jest.fn(),
  requestFileRevision: jest.fn(),
}));
jest.mock("../PropertyShareDialog", () => ({
  __esModule: true,
  default: (props) => {
    mockPropertyShareDialog(props);
    return <div data-testid="property-share-dialog" />;
  },
}));

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
    Element.prototype.scrollIntoView = jest.fn();
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

  it("uses a real download link for browser-native mobile downloads", () => {
    render(<FileList bookings={[makeBooking()]} />);

    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute(
      "href",
      "/api/files/download?fileId=10&name=living-room.webp",
    );
    expect(link).toHaveAttribute("download", "living-room.webp");
    expect(link).toHaveAttribute("target", "_blank");
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

  it("places share-link creation on an eligible completed project card", () => {
    const propertySharing = {
      eligibleProperties: [
        {
          id: 1,
          bookingTitle: "101, Tower A, Marina",
        },
      ],
      shares: [],
    };
    render(
      <FileList
        bookings={[
          makeBooking({
            completedAt: "2026-07-23T10:00:00.000Z",
          }),
        ]}
        propertySharing={propertySharing}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Share Link" }));

    expect(mockPropertyShareDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 1,
        initialData: propertySharing,
      }),
    );
  });

  it("offers contextual management when a completed project is already shared", () => {
    render(
      <FileList
        bookings={[
          makeBooking({
            completedAt: "2026-07-23T10:00:00.000Z",
          }),
        ]}
        propertySharing={{
          eligibleProperties: [{ id: 1 }],
          shares: [
            {
              id: 9,
              kind: "SINGLE_PROPERTY",
              properties: [{ bookingId: 1 }],
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Manage Share Link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create Share Link" }),
    ).not.toBeInTheDocument();
  });

  it("scrolls to and visually identifies the requested file card", async () => {
    render(
      <FileList
        bookings={[
          makeBooking({
            deliveryFiles: [
              makeFile(),
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
        highlightedFileId={11}
        requestedFileAvailable
        requestedFileIdWasProvided
      />,
    );

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    expect(screen.getByText("Selected file")).toBeInTheDocument();
    expect(
      screen.getByText("Opened from a shared dashboard link."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("delivery-file-card-11")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  });

  it("shows a generic notice for missing or inaccessible deep-linked files", () => {
    render(
      <FileList
        bookings={[makeBooking()]}
        highlightedFileId={null}
        requestedFileAvailable={false}
        requestedFileIdWasProvided
      />,
    );

    expect(
      screen.getByText(
        "The selected file is unavailable in this dashboard. Browse your available files below.",
      ),
    ).toBeInTheDocument();
  });

  it("renders file metadata as plain text even when it contains markup-like content", () => {
    const { container } = render(
      <FileList
        bookings={[
          makeBooking({
            deliveryFiles: [
              makeFile({
                label: 'Review <script>alert("x")</script>\nFinal',
                currentVersion: {
                  id: 100,
                  originalFilename:
                    'living-room-<img src=x onerror=alert("x")>.webp',
                  url: "https://bucket.example/living-room.webp",
                },
              }),
            ],
          }),
        ]}
      />,
    );

    expect(
      screen.getByText('living-room-<img src=x onerror=alert("x")>.webp'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Review <script>alert\("x"\)<\/script>/),
    ).toHaveTextContent('Review <script>alert("x")</script> Final');
    expect(container.querySelector("script")).toBeNull();
  });
});
