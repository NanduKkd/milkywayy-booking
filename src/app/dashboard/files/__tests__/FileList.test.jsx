import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { completeDeliveredBooking } from "@/lib/actions/bookings";
import FileList from "../FileList";

const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/lib/actions/bookings", () => ({
  completeDeliveredBooking: jest.fn(),
  requestDeliveryServiceRevision: jest.fn(),
}));
jest.mock("../CreatePropertyShareDialog", () => ({
  __esModule: true,
  default: () => <div data-testid="create-property-share-dialog" />,
}));

const file = (overrides = {}) => ({
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

const booking = (overrides = {}) => ({
  id: 1,
  propertyDetails: { unit: "101", building: "Tower A", community: "Marina" },
  deliveryFinishedAt: null,
  completedAt: null,
  deliveryFiles: [file()],
  ...overrides,
});

describe("customer Properties delivery list", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    completeDeliveredBooking.mockResolvedValue({ success: true });
  });

  it("opens the same reusable delivery modal used by Bookings", () => {
    render(<FileList bookings={[booking()]} />);

    fireEvent.click(screen.getByRole("button", { name: /download files/i }));

    expect(
      screen.getByRole("dialog", { name: /download files/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Photography: ready for review"),
    ).toBeInTheDocument();
  });

  it("keeps multi-file services ZIP-only inside the shared modal", () => {
    render(
      <FileList
        bookings={[
          booking({
            deliveryFiles: [file(), file({ id: 11 })],
          }),
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /download files/i }));

    expect(
      screen.getByRole("link", { name: /download zip/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("living-room.webp")).not.toBeInTheDocument();
  });

  it("retains legacy exact-type labels as separate service projections", () => {
    render(
      <FileList
        bookings={[
          booking({
            deliveryFiles: [
              file({ type: "Videography", label: "Videography" }),
              file({
                id: 11,
                type: "Long Form Video",
                label: "Long Form Video",
              }),
            ],
          }),
        ]}
      />,
    );

    expect(
      screen.getByText(/Videography: ready for review/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Long Form Video: ready for review/i),
    ).toBeInTheDocument();
  });

  it("retains completion and share creation actions", async () => {
    render(
      <FileList
        bookings={[booking({ deliveryFinishedAt: "2026-07-27T10:00:00Z" })]}
        propertySharing={{
          eligibleProperties: [{ id: 1 }],
          shares: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create share link/i }));
    expect(
      screen.getByTestId("create-property-share-dialog"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mark complete/i }));
    await waitFor(() =>
      expect(completeDeliveredBooking).toHaveBeenCalledWith(1),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not expose targeted fileId existence or highlight state", () => {
    const { container } = render(<FileList bookings={[booking()]} />);
    expect(container.querySelector("[data-highlighted]")).toBeNull();
    expect(screen.queryByText(/selected file/i)).toBeNull();
    expect(screen.queryByText(/unavailable in this dashboard/i)).toBeNull();
  });
});
