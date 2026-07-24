import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  completeDeliveredBooking,
  requestDeliveryServiceRevision,
} from "@/lib/actions/bookings";
import FileList from "../FileList";

const mockRefresh = jest.fn();
const mockCreatePropertyShareDialog = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

jest.mock("@/lib/actions/bookings", () => ({
  completeDeliveredBooking: jest.fn(),
  requestDeliveryServiceRevision: jest.fn(),
}));
jest.mock("../CreatePropertyShareDialog", () => ({
  __esModule: true,
  default: (props) => {
    mockCreatePropertyShareDialog(props);
    return <div data-testid="create-property-share-dialog" />;
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
    requestDeliveryServiceRevision.mockResolvedValue({ success: true });
    completeDeliveredBooking.mockResolvedValue({ success: true });
    Element.prototype.scrollIntoView = jest.fn();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("groups current service files under one counter and deadline", () => {
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
    expect(screen.queryByText("Revision 0/2")).not.toBeInTheDocument();
    expect(screen.getByText("Revision 1/2")).toBeInTheDocument();
    expect(screen.getAllByText(/review by/i)).toHaveLength(1);
  });

  it("renders canonical video labels distinctly and keeps legacy Videography readable", () => {
    render(
      <FileList
        bookings={[
          makeBooking({
            deliveryFiles: [
              makeFile({
                id: 10,
                type: "Short Form Video",
                label: "Short Form Video",
                currentVersion: {
                  id: 100,
                  originalFilename: "short.mp4",
                  url: "https://bucket.example/short.mp4",
                },
              }),
              makeFile({
                id: 11,
                type: "Long Form Video",
                label: "Long Form Video",
                currentVersion: {
                  id: 101,
                  originalFilename: "long.mp4",
                  url: "https://bucket.example/long.mp4",
                },
              }),
              makeFile({
                id: 12,
                type: "Videography",
                label: "Videography",
                currentVersion: {
                  id: 102,
                  originalFilename: "legacy.mp4",
                  url: "https://bucket.example/legacy.mp4",
                },
              }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getAllByText("Short Form Video")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Long Form Video")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Videography")[0]).toBeInTheDocument();
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

  it("offers one ZIP action only for multi-file service groups", () => {
    const { rerender } = render(<FileList bookings={[makeBooking()]} />);
    expect(screen.queryByRole("link", { name: "Download ZIP" })).toBeNull();

    rerender(
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
      />,
    );
    expect(screen.getByRole("link", { name: "Download ZIP" })).toHaveAttribute(
      "href",
      "/api/files/download-zip?bookingId=1&type=Photography",
    );
    expect(screen.getByRole("link", { name: "Download ZIP" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getAllByRole("link", { name: /^download$/i })).toHaveLength(
      2,
    );
  });

  it("does not offer a partial ZIP while any service member awaits replacement", () => {
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
              makeFile({
                id: 12,
                status: "CHANGES_REQUESTED",
                currentVersion: {
                  id: 102,
                  originalFilename: "old-balcony.webp",
                  url: "https://bucket.example/old-balcony.webp",
                },
              }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("living-room.webp")).toBeInTheDocument();
    expect(screen.getByText("kitchen.webp")).toBeInTheDocument();
    expect(screen.queryByText("old-balcony.webp")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download ZIP" })).toBeNull();
  });

  it("keeps individual direct and copy-link actions in a mixed ZIP group", async () => {
    render(
      <FileList
        bookings={[
          makeBooking({
            deliveryFiles: [
              makeFile(),
              makeFile({
                id: 11,
                deliveryMode: "copy_link",
                currentVersion: {
                  id: 101,
                  originalFilename: "tour-link",
                  url: "https://example.test/tour",
                },
              }),
            ],
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Download ZIP" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^download$/i })).toHaveAttribute(
      "href",
      "/api/files/download?fileId=10&name=living-room.webp",
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://example.test/tour",
      );
    });
  });

  it("submits one revision against the selected service group", async () => {
    render(<FileList bookings={[makeBooking()]} />);

    fireEvent.click(screen.getByRole("button", { name: /request revision/i }));
    const submit = screen.getByRole("button", { name: /submit revision/i });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/revision details/i), {
      target: { value: "Brighten the kitchen" },
    });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(requestDeliveryServiceRevision).toHaveBeenCalledWith(
        1,
        "Photography",
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
    expect(
      screen.getByText(/replacement pending for this service/i),
    ).toBeInTheDocument();
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

  it("places Create Share Link on an eligible unshared completed file card", () => {
    const property = {
      id: 1,
      bookingTitle: "101, Tower A, Marina",
    };
    render(
      <FileList
        bookings={[
          makeBooking({
            completedAt: "2026-07-23T10:00:00.000Z",
          }),
        ]}
        propertySharing={{
          eligibleProperties: [property],
          shares: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Share Link" }));

    expect(mockCreatePropertyShareDialog).toHaveBeenCalledWith(
      expect.objectContaining({ property }),
    );
  });

  it("places Create Share Link on an eligible booking while media is under review", () => {
    const property = {
      id: 1,
      bookingTitle: "101, Tower A, Marina",
    };
    render(
      <FileList
        bookings={[makeBooking()]}
        propertySharing={{
          eligibleProperties: [property],
          shares: [],
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Create Share Link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delivery In Progress" }),
    ).toBeDisabled();
  });

  it("leaves existing share management to Shared Properties cards", () => {
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
      screen.queryByRole("button", { name: "Create Share Link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manage Share Link" }),
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
      screen.getAllByText(/Review <script>alert\("x"\)<\/script>/)[0],
    ).toHaveTextContent('Review <script>alert("x")</script> Final');
    expect(container.querySelector("script")).toBeNull();
  });
});
