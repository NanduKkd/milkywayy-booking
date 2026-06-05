import { updateBookingWorkflow } from "../../../../lib/actions/bookings";
import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import BookingsPage from "../page";

// Mock global fetch
global.fetch = jest.fn();

const mockBookings = [
  {
    id: 1,
    date: "2025-12-25",
    total: 500,
    status: "CONFIRMED",
    workflowStatus: "SHOOT_BOOKED",
    propertyDetails: { unit: "101", building: "Tower A", community: "Marina" },
    transaction: { status: "success", amount: 500 },
    shootDetails: { services: ["Photography"] },
    user: { fullName: "Test User", email: "test@example.com", phone: "123456" },
  },
];

describe("Admin Bookings Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockImplementation((url) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({
          json: async () => mockBookings,
        });
      }
      return Promise.resolve({
        json: async () => ({}),
      });
    });

    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    // Mock window.alert
    window.alert = jest.fn();
  });

  it("renders bookings table after fetching", async () => {
    render(<BookingsPage />);
    expect(await screen.findByText("101, Tower A, Marina")).toBeInTheDocument();
    expect(screen.getByText("AED 500")).toBeInTheDocument();
  });

  it("opens dialog when row is clicked", async () => {
    render(<BookingsPage />);
    const row = await screen.findByText("101, Tower A, Marina");
    fireEvent.click(row);
    expect(screen.getByText(/booking details #1/i)).toBeInTheDocument();
  });

  it("advances the workflow to shoot done", async () => {
    updateBookingWorkflow.mockResolvedValue({
      success: true,
      data: { workflowStatus: "SHOOT_DONE" },
    });
    render(<BookingsPage />);

    const row = await screen.findByText("101, Tower A, Marina");
    fireEvent.click(row);

    const workflowButton = screen.getByRole("button", {
      name: /mark shoot done/i,
    });
    fireEvent.click(workflowButton);

    await waitFor(() => {
      expect(updateBookingWorkflow).toHaveBeenCalledWith(1, "SHOOT_DONE");
    });
    expect(window.alert).toHaveBeenCalledWith("Shoot marked as done");
  });

  it("handles file upload while editing", async () => {
    const editingBooking = {
      ...mockBookings[0],
      workflowStatus: "EDITING",
    };

    global.fetch.mockImplementation((url, init) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({ json: async () => [editingBooking] });
      }
      if (url === "/api/admin/upload" && init?.method === "POST") {
        return Promise.resolve({
          json: async () => ({
            url: "https://s3.example.com/file-1.jpg",
            urls: [
              "https://s3.example.com/file-1.jpg",
              "https://s3.example.com/file-2.jpg",
            ],
          }),
        });
      }
      return Promise.resolve({
        json: async () => ({}),
      });
    });

    render(<BookingsPage />);

    const row = await screen.findByText("101, Tower A, Marina");
    fireEvent.click(row);

    // Check if upload section is visible
    expect(
      screen.getByRole("heading", { name: "Deliverables" }),
    ).toBeInTheDocument();

    // In JSDOM, portals are rendered into document.body
    const fileInput = document.querySelector('input[type="file"]');
    const fileOne = new File(["test"], "test-1.jpg", { type: "image/jpeg" });
    const fileTwo = new File(["test"], "test-2.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [fileOne, fileTwo] } });

    expect(screen.getByText("2 file(s) selected")).toBeInTheDocument();

    const uploadButton = screen.getByRole("button", {
      name: /upload deliverable/i,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/upload",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    expect(window.alert).toHaveBeenCalledWith(
      "2 file(s) uploaded successfully",
    );
  });

  it("shows every current file and allows deleting one", async () => {
    const filesUrl = JSON.stringify({
      version: 2,
      deliverables: [
        {
          id: "photography",
          type: "Photography",
          label: "Photography",
          url: "https://example.com/file-1.jpg",
          urls: [
            "https://example.com/file-1.jpg",
            "https://example.com/file-2.jpg",
          ],
        },
      ],
    });
    const editingBooking = {
      ...mockBookings[0],
      workflowStatus: "EDITING",
      filesUrl,
    };

    global.fetch.mockImplementation((url, init) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({ json: async () => [editingBooking] });
      }
      if (
        url === "/api/admin/bookings/1/deliverables" &&
        init?.method === "DELETE"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            filesUrl: JSON.stringify({
              version: 2,
              deliverables: [
                {
                  id: "photography",
                  type: "Photography",
                  label: "Photography",
                  url: "https://example.com/file-2.jpg",
                  urls: ["https://example.com/file-2.jpg"],
                },
              ],
            }),
          }),
        });
      }
      return Promise.resolve({ json: async () => ({}) });
    });

    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));

    expect(
      screen.getByRole("link", { name: "file-1.jpg" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "file-2.jpg" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete file-1.jpg" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/bookings/1/deliverables",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({
            source: "current",
            deliverableId: "photography",
            url: "https://example.com/file-1.jpg",
          }),
        }),
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "file-1.jpg" }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows and restores files from the previous revision", async () => {
    const previousFiles = [
      {
        id: "photography",
        type: "Photography",
        label: "Photography",
        url: "https://example.com/previous.jpg",
        urls: ["https://example.com/previous.jpg"],
      },
    ];
    const editingBooking = {
      ...mockBookings[0],
      workflowStatus: "EDITING",
      filesUrl: JSON.stringify({
        version: 2,
        deliverables: [],
        archivedDeliverables: previousFiles,
      }),
    };

    global.fetch.mockImplementation((url, init) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({ json: async () => [editingBooking] });
      }
      if (
        url === "/api/admin/bookings/1/deliverables" &&
        init?.method === "POST"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            filesUrl: JSON.stringify({
              version: 2,
              deliverables: previousFiles,
              archivedDeliverables: [],
            }),
          }),
        });
      }
      return Promise.resolve({ json: async () => ({}) });
    });

    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));

    expect(screen.getByText("Previous Version")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "previous.jpg" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /use previous files/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /mark files uploaded/i }),
      ).not.toBeDisabled();
    });
    expect(window.alert).toHaveBeenCalledWith(
      'Previous files restored. You can now click "Mark Files Uploaded".',
    );
  });

  it("keeps previous files visible during customer review", async () => {
    const reviewBooking = {
      ...mockBookings[0],
      workflowStatus: "FILES_UPLOADED",
      filesUrl: JSON.stringify({
        version: 2,
        deliverables: [
          {
            id: "photography",
            type: "Photography",
            url: "https://example.com/revised.jpg",
            urls: ["https://example.com/revised.jpg"],
          },
        ],
        archivedDeliverables: [
          {
            id: "photography",
            type: "Photography",
            url: "https://example.com/original.jpg",
            urls: ["https://example.com/original.jpg"],
          },
        ],
      }),
    };
    global.fetch.mockImplementation((url) =>
      Promise.resolve({
        json: async () =>
          url === "/api/admin/bookings" ? [reviewBooking] : {},
      }),
    );

    render(<BookingsPage />);
    fireEvent.click(await screen.findByText("101, Tower A, Marina"));

    expect(
      screen.getByRole("link", { name: "revised.jpg" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "original.jpg" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /use previous files/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete original.jpg/i }),
    ).not.toBeInTheDocument();
  });

  it("shows only the single-service media trigger for single-service bookings", async () => {
    const completedBooking = {
      ...mockBookings[0],
      workflowStatus: "EDITING",
      filesUrl: JSON.stringify({
        version: 2,
        deliverables: [
          {
            type: "Photography",
            label: "Photography",
            url: "https://s3.example.com/file-1.jpg",
            urls: ["https://s3.example.com/file-1.jpg"],
            count: 1,
          },
        ],
      }),
    };

    global.fetch.mockImplementation((url, init) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({
          json: async () => [completedBooking],
        });
      }
      if (url === "/api/notifications/whatsapp" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            filesUrl: JSON.stringify({
              version: 2,
              deliverables: [
                {
                  type: "Photography",
                  label: "Photography",
                  url: "https://s3.example.com/file-1.jpg",
                  urls: ["https://s3.example.com/file-1.jpg"],
                  count: 1,
                },
              ],
              notifications: {
                singleServiceMediaReadySentAt: "2026-03-25T10:00:00.000Z",
              },
            }),
          }),
        });
      }
      return Promise.resolve({
        json: async () => ({}),
      });
    });

    render(<BookingsPage />);

    const row = await screen.findByText("101, Tower A, Marina");
    fireEvent.click(row);

    expect(
      screen.getByRole("button", { name: /send single service ready/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send photos ready/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send all media delivered/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /send single service ready/i }),
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/whatsapp",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            type: "single_service_media_ready",
            bookingId: 1,
          }),
        }),
      );
    });
    expect(window.alert).toHaveBeenCalledWith(
      "Single service media ready notification sent.",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /single service sent/i }),
      ).toBeDisabled();
    });
  });

  it("shows only multi-service media triggers for multi-service bookings", async () => {
    const baseFilesPayload = {
      version: 2,
      deliverables: [
        {
          type: "Photography",
          label: "Photography",
          url: "https://s3.example.com/file-1.jpg",
          urls: ["https://s3.example.com/file-1.jpg"],
          count: 1,
        },
      ],
    };
    const completedBooking = {
      ...mockBookings[0],
      workflowStatus: "EDITING",
      shootDetails: { services: ["Photography", "Videography"] },
      filesUrl: JSON.stringify(baseFilesPayload),
    };

    global.fetch.mockImplementation((url, init) => {
      if (url === "/api/admin/bookings") {
        return Promise.resolve({
          json: async () => [completedBooking],
        });
      }
      if (url === "/api/notifications/whatsapp" && init?.method === "POST") {
        const { type } = JSON.parse(init.body);
        const notifications =
          type === "partial_media_upload"
            ? { partialMediaUploadSentAt: "2026-03-24T10:00:00.000Z" }
            : {
                partialMediaUploadSentAt: "2026-03-24T10:00:00.000Z",
                fullMediaUploadSentAt: "2026-03-24T10:05:00.000Z",
              };
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            filesUrl: JSON.stringify({
              ...baseFilesPayload,
              notifications,
            }),
          }),
        });
      }
      return Promise.resolve({
        json: async () => ({}),
      });
    });

    render(<BookingsPage />);

    const row = await screen.findByText("101, Tower A, Marina");
    fireEvent.click(row);

    expect(
      screen.queryByRole("button", { name: /send single service ready/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /send photos ready/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/whatsapp",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            type: "partial_media_upload",
            bookingId: 1,
          }),
        }),
      );
    });
    expect(window.alert).toHaveBeenCalledWith(
      "Partial media upload notification sent.",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /photos ready sent/i }),
      ).toBeDisabled();
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /send all media delivered/i }),
      ).not.toBeDisabled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /send all media delivered/i }),
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/whatsapp",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            type: "full_media_upload",
            bookingId: 1,
          }),
        }),
      );
    });
    expect(window.alert).toHaveBeenCalledWith(
      "Full media upload notification sent.",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /all media sent/i }),
      ).toBeDisabled();
    });
  });
});
