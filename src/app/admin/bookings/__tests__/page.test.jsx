import { updateBookingWorkflow } from "../../../../lib/actions/bookings";
import { uploadBookingFile } from "../../../../lib/uploads/multipart";
import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import BookingsPage from "../page";

global.fetch = jest.fn();
jest.mock("../../../../lib/uploads/multipart", () => ({
  MAX_BOOKING_UPLOAD_BYTES: 2_147_483_648,
  uploadBookingFile: jest.fn(),
}));

const baseBooking = {
  id: 1,
  date: "2026-06-08",
  total: 500,
  status: "CONFIRMED",
  workflowStatus: "EDITING",
  propertyDetails: { unit: "101", building: "Tower A", community: "Marina" },
  transaction: { status: "success", amount: 500 },
  shootDetails: { services: ["Photography"] },
  user: { fullName: "Test User", email: "test@example.com", phone: "123456" },
  deliveryFiles: [],
  deliveryNotificationMetadata: {},
};

const deliveryFile = {
  id: 10,
  type: "Photography",
  label: "Photography",
  deliveryMode: "download",
  status: "UNDER_REVIEW",
  revisionCount: 0,
  currentVersion: {
    id: 100,
    originalFilename: "living-room.webp",
    url: "https://example.com/living-room.webp",
  },
  versions: [{ id: 100, versionNumber: 1 }],
  fileRevisions: [],
};

describe("Admin Bookings Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    global.fetch.mockImplementation((url) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({ ok: true, json: async () => [baseBooking] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("renders bookings and opens details", async () => {
    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));
    expect(screen.getByText(/booking details #1/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Deliverables" }),
    ).toBeInTheDocument();
  });

  it("advances the workflow before delivery starts", async () => {
    const booking = { ...baseBooking, workflowStatus: "SHOOT_DONE" };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [booking],
    });
    updateBookingWorkflow.mockResolvedValue({
      success: true,
      data: { workflowStatus: "EDITING" },
    });

    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));
    fireEvent.click(screen.getByRole("button", { name: /start editing/i }));

    await waitFor(() => {
      expect(updateBookingWorkflow).toHaveBeenCalledWith(1, "EDITING");
    });
  });

  it("appends every uploaded physical file", async () => {
    global.fetch.mockImplementation((url) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({
          ok: true,
          json: async () => [baseBooking],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    uploadBookingFile
      .mockResolvedValueOnce({
        url: "https://example.com/one.jpg",
        filesUrl: "{}",
        booking: { workflowStatus: "FILES_UPLOADED" },
        deliveryFiles: [
          {
            ...deliveryFile,
            currentVersion: {
              ...deliveryFile.currentVersion,
              originalFilename: "one.jpg",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        url: "https://example.com/two.jpg",
        filesUrl: "{}",
        booking: { workflowStatus: "FILES_UPLOADED" },
        deliveryFiles: [
          {
            ...deliveryFile,
            id: 11,
            currentVersion: {
              id: 101,
              originalFilename: "two.jpg",
              url: "https://example.com/two.jpg",
            },
          },
        ],
      });

    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["one"], "one.jpg", { type: "image/jpeg" }),
          new File(["two"], "two.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload files/i }));

    await waitFor(() => {
      expect(uploadBookingFile).toHaveBeenCalledTimes(2);
    });
    expect(window.alert).toHaveBeenCalledWith(
      "2 file(s) uploaded successfully",
    );
  });

  it("shows revision notes and uploads a targeted replacement", async () => {
    const requestedFile = {
      ...deliveryFile,
      status: "CHANGES_REQUESTED",
      revisionCount: 1,
      fileRevisions: [
        { id: 1, note: "Brighten the kitchen", resolvedAt: null },
      ],
    };
    const booking = {
      ...baseBooking,
      workflowStatus: "FILES_UPLOADED",
      deliveryFiles: [requestedFile],
    };
    global.fetch.mockImplementation((url) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({ ok: true, json: async () => [booking] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    uploadBookingFile.mockResolvedValue({
      url: "https://example.com/replacement.jpg",
      filesUrl: "{}",
      booking: {},
      deliveryFiles: [
        {
          ...requestedFile,
          status: "UNDER_REVIEW",
          currentVersion: {
            id: 101,
            originalFilename: "replacement.jpg",
            url: "https://example.com/replacement.jpg",
          },
        },
      ],
    });

    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));
    expect(screen.getByText("Brighten the kitchen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /replace file/i }));

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["replacement"], "replacement.jpg", {
            type: "image/jpeg",
          }),
        ],
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /upload replacement/i }),
    );

    await waitFor(() => {
      expect(uploadBookingFile).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 1,
          replacementFileId: 10,
          deliverableType: "Photography",
        }),
      );
    });
  });

  it("marks a resolved delivery as finished", async () => {
    const booking = {
      ...baseBooking,
      workflowStatus: "FILES_UPLOADED",
      deliveryFiles: [deliveryFile],
    };
    global.fetch.mockImplementation((url, init) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({ ok: true, json: async () => [booking] });
      }
      if (
        url === "/api/admin/bookings/1/deliverables" &&
        init?.method === "POST"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            booking: {
              deliveryFinishedAt: "2026-06-08T10:00:00.000Z",
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));
    fireEvent.click(
      screen.getByRole("button", { name: /mark delivery finished/i }),
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Delivery marked as finished.");
    });
  });
});
