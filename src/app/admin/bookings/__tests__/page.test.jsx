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
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

describe("Admin Bookings Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = jest.fn();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    global.fetch.mockImplementation((url) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({ ok: true, json: async () => [baseBooking] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  afterAll(() => {
    if (originalScrollIntoView) {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    } else {
      delete HTMLElement.prototype.scrollIntoView;
    }
  });

  it("renders bookings and opens details", async () => {
    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));
    expect(screen.getByText(/booking #1/i)).toBeInTheDocument();
    expect(screen.queryByText(/contact details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/total queue/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Deliverables" }),
    ).toBeInTheDocument();
  });

  it("offers exactly the four canonical types for new deliveries", async () => {
    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));

    const selector = screen.getByLabelText("Deliverable Type");
    expect(
      Array.from(selector.options, (option) => option.textContent),
    ).toEqual([
      "Photography",
      "Short Form Video",
      "Long Form Video",
      "360 Virtual Tour",
    ]);
    expect(screen.queryByRole("option", { name: "Videography" })).toBeNull();
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

  it("filters bookings by status buckets", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        baseBooking,
        {
          ...baseBooking,
          id: 2,
          propertyDetails: {
            unit: "202",
            building: "Tower B",
            community: "JLT",
          },
          workflowStatus: "PROJECT_COMPLETED",
          completedAt: "2026-06-10T10:00:00.000Z",
        },
        {
          ...baseBooking,
          id: 3,
          propertyDetails: {
            unit: "303",
            building: "Tower C",
            community: "Downtown",
          },
          status: "CANCELLED",
          cancelledAt: "2026-06-11T10:00:00.000Z",
        },
        {
          ...baseBooking,
          id: 4,
          propertyDetails: {
            unit: "404",
            building: "Tower D",
            community: "Business Bay",
          },
          status: "DRAFT",
          workflowStatus: "SHOOT_BOOKED",
        },
        {
          ...baseBooking,
          id: 5,
          propertyDetails: {
            unit: "505",
            building: "Tower E",
            community: "Marina",
          },
          workflowStatus: "SHOOT_BOOKED",
        },
      ],
    });

    render(<BookingsPage />);

    expect(await screen.findByText("101, Tower A, Marina")).toBeInTheDocument();
    expect(screen.getByText("202, Tower B, JLT")).toBeInTheDocument();
    expect(screen.getByText("303, Tower C, Downtown")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /pending/i }));

    expect(screen.queryByText("101, Tower A, Marina")).not.toBeInTheDocument();
    expect(screen.getByText("404, Tower D, Business Bay")).toBeInTheDocument();
    expect(screen.getByText("505, Tower E, Marina")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /completed/i }));

    expect(screen.queryByText("101, Tower A, Marina")).not.toBeInTheDocument();
    expect(screen.getByText("202, Tower B, JLT")).toBeInTheDocument();
    expect(
      screen.queryByText("303, Tower C, Downtown"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancelled/i }));

    expect(screen.queryByText("202, Tower B, JLT")).not.toBeInTheDocument();
    expect(screen.getByText("303, Tower C, Downtown")).toBeInTheDocument();
  });

  it("paginates the filtered booking list ten rows at a time", async () => {
    const bookings = Array.from({ length: 11 }, (_, index) => ({
      ...baseBooking,
      id: index + 1,
      propertyDetails: {
        unit: `Unit ${String(index + 1).padStart(2, "0")}`,
        building: "Pagination Tower",
        community: "Test District",
      },
    }));
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => bookings,
    });

    render(<BookingsPage />);

    expect(
      await screen.findByText("Unit 01, Pagination Tower, Test District"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Unit 11, Pagination Tower, Test District"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2 · 11 bookings")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next bookings page" }));

    expect(
      screen.getByText("Unit 11, Pagination Tower, Test District"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Unit 01, Pagination Tower, Test District"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2 · 11 bookings")).toBeInTheDocument();
  });

  it("shows a pending replacement when a customer requested changes", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          ...baseBooking,
          workflowStatus: "FILES_UPLOADED",
          deliveryFiles: [
            {
              ...deliveryFile,
              status: "CHANGES_REQUESTED",
              fileRevisions: [
                {
                  id: 1,
                  note: "Please brighten the kitchen",
                  resolvedAt: null,
                },
              ],
            },
          ],
        },
      ],
    });

    render(<BookingsPage />);

    expect(await screen.findByText("Replacement Pending")).toBeInTheDocument();
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

  it("shows revision notes and retains legacy Videography for replacement", async () => {
    const requestedFile = {
      ...deliveryFile,
      type: "Videography",
      label: "Videography",
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
    const replacementType = screen.getByTestId("replacement-deliverable-type");
    const fileInput = screen.getByLabelText("Delivery file");
    const uploadReplacement = screen.getByRole("button", {
      name: /upload replacement/i,
    });
    expect(replacementType).toHaveTextContent("Videography");
    expect(screen.queryByLabelText("Deliverable Type")).toBeNull();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(fileInput).toHaveFocus();
    expect(uploadReplacement).toBeInTheDocument();

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
          deliverableType: "Videography",
        }),
      );
    });
    expect(screen.getByLabelText("Deliverable Type")).toHaveValue(
      "Photography",
    );
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
