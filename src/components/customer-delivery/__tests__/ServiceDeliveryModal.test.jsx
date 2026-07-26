import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { requestDeliveryServiceRevision } from "@/lib/actions/bookings";
import ServiceDeliveryModal from "../ServiceDeliveryModal";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/lib/actions/bookings", () => ({
  requestDeliveryServiceRevision: jest.fn(),
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
    originalFilename: "living-room.webp",
    url: "https://bucket.example/living-room.webp",
  },
  ...overrides,
});

const makeBooking = (deliveryFiles = [makeFile()]) => ({
  id: 42,
  propertyDetails: { unit: "101", building: "Tower A", community: "Marina" },
  deliveryFiles,
});

describe("ServiceDeliveryModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestDeliveryServiceRevision.mockResolvedValue({ success: true });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("keeps multi-file services ZIP-only and exposes an individual download for one-file services", () => {
    render(
      <ServiceDeliveryModal
        booking={makeBooking([
          makeFile(),
          makeFile({
            id: 11,
            currentVersion: {
              originalFilename: "kitchen.webp",
              url: "https://bucket.example/kitchen.webp",
            },
          }),
          makeFile({
            id: 12,
            type: "Long Form Video",
            label: "Long Form Video",
            currentVersion: {
              originalFilename: "walkthrough.mp4",
              url: "https://bucket.example/walkthrough.mp4",
            },
          }),
        ])}
        open
        onOpenChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "Download ZIP" })).toHaveAttribute(
      "href",
      "/api/files/download-zip?bookingId=42&type=Photography",
    );
    expect(screen.queryByText("living-room.webp")).not.toBeInTheDocument();
    expect(screen.queryByText("kitchen.webp")).not.toBeInTheDocument();
    expect(screen.getByText("walkthrough.mp4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
      "href",
      "/api/files/download?fileId=12&name=walkthrough.mp4",
    );
  });

  it("submits one revision for the exact service group", async () => {
    render(
      <ServiceDeliveryModal
        booking={makeBooking()}
        open
        onOpenChange={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Request review" }));
    fireEvent.change(screen.getByLabelText("Revision details"), {
      target: { value: "Brighten the kitchen" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit revision" }));

    await waitFor(() => {
      expect(requestDeliveryServiceRevision).toHaveBeenCalledWith(
        42,
        "Photography",
        "Brighten the kitchen",
      );
    });
  });

  it("retains the one-file copy-link action without treating it as a ZIP service", async () => {
    render(
      <ServiceDeliveryModal
        booking={makeBooking([
          makeFile({
            deliveryMode: "copy_link",
            currentVersion: {
              originalFilename: "tour-link",
              url: "https://example.test/tour",
            },
          }),
        ])}
        open
        onOpenChange={jest.fn()}
      />,
    );

    expect(screen.queryByRole("link", { name: "Download ZIP" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://example.test/tour",
      );
    });
  });
});
