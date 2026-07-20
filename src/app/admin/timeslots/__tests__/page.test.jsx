import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import TimeSlotsPage from "../page";

global.fetch = jest.fn();

function buildDateKey(dayOfMonth) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(dayOfMonth).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const bookedDateKey = buildDateKey(15);

const mockResponse = {
  bookedDetailsMap: {
    [bookedDateKey]: {
      morning: [
        {
          arrival: "09:00 - 09:30",
          bookingCode: "BK-001",
          propertyLabel: "Apartment - Studio",
          serviceLabel: "Photo",
        },
      ],
    },
  },
  bookedMap: {
    [bookedDateKey]: ["morning", "afternoon"],
  },
  config: {
    dateOverrides: {
      [bookedDateKey]: {
        blocks: {
          evening: "blocked",
        },
      },
    },
    systemSettings: {
      blockDefinitions: {
        afternoon: { endTime: "16:00", startTime: "13:00" },
        evening: { endTime: "20:00", startTime: "17:00" },
        morning: { endTime: "12:00", startTime: "09:00" },
      },
      rollingWindowDays: 90,
      weightModel: {
        propertyWeights: {
          Apartment: { Studio: 1 },
          Commercial: { Basic: 2 },
          "Villa/Townhouse": { "2 Bed": 2 },
        },
        serviceWeights: {
          "360 Virtual Tour": { active: true, weight: 1.5 },
          "Long Form - Day + Night": { active: false, weight: 3 },
          "Long Form - Daylight": { active: true, weight: 2 },
          "Long Form - Night": { active: true, weight: 2 },
          Photo: { active: true, weight: 1 },
          "Short Form Video": { active: true, weight: 1.5 },
        },
      },
      workingDays: {
        Friday: true,
        Monday: true,
        Thursday: true,
        Tuesday: true,
        Wednesday: true,
      },
    },
  },
};

describe("Admin Time Slots Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockImplementation((url, options) => {
      if (url === "/api/admin/timeslots" && options?.method === "GET") {
        return Promise.resolve({
          ok: true,
          json: async () => mockResponse,
        });
      }

      if (url === "/api/admin/timeslots" && options?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
  });

  it("renders the dense scheduling shell without summary cards", async () => {
    render(<TimeSlotsPage />);

    expect(screen.getByText(/loading time slot settings/i)).toBeInTheDocument();
    expect(await screen.findByText("System settings")).toBeInTheDocument();
    expect(
      screen.queryByText("Booked periods in view"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Block Full Day/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/rolling window length/i)).toHaveValue(90);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/timeslots",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("preserves save behavior when updating the rolling window", async () => {
    render(<TimeSlotsPage />);

    const rollingWindowInput = await screen.findByLabelText(
      /rolling window length/i,
    );
    fireEvent.change(rollingWindowInput, { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/timeslots",
        expect.objectContaining({
          body: expect.any(String),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        }),
      );
    });

    const saveCall = global.fetch.mock.calls.find(
      ([url, options]) =>
        url === "/api/admin/timeslots" && options?.method === "PUT",
    );
    const payload = JSON.parse(saveCall[1].body);

    expect(payload.timeSlots.systemSettings.rollingWindowDays).toBe(120);
  });

  it("keeps date blocking out of the time slot configuration route", async () => {
    render(<TimeSlotsPage />);

    await screen.findByText("System settings");

    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /clear blocks/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/booked/i)).not.toBeInTheDocument();
  });

  it("shows a retryable error state when the initial load fails", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "load failed" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

    render(<TimeSlotsPage />);

    expect(
      await screen.findByText("Unable to load time slot settings"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("System settings")).toBeInTheDocument();
  });
});
