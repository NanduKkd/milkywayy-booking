import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PropertySharingManager from "../PropertySharingManager";

const mockCreateSingle = jest.fn();
const mockGetDashboard = jest.fn();

jest.mock("@/lib/actions/propertySharing", () => ({
  createMasterPropertyShareAction: jest.fn(),
  createSinglePropertyShareAction: (...args) => mockCreateSingle(...args),
  getPropertySharingDashboardAction: (...args) => mockGetDashboard(...args),
  refreshPropertyShareSnapshotAction: jest.fn(),
  revokePropertyShareAction: jest.fn(),
  rotatePropertyShareTokenAction: jest.fn(),
  setPropertyShareEnabledAction: jest.fn(),
  updateMasterPropertyShareAction: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const emptySeries = Array.from({ length: 30 }, (_, index) => ({
  date: `2026-07-${String(index + 1).padStart(2, "0")}`,
  requestViews: 0,
}));

function data() {
  return {
    eligibleProperties: [
      { id: 20, title: "Synthetic Tower", fileCount: 2 },
      { id: 21, title: "Sample Villa", fileCount: 1 },
    ],
    shares: [
      {
        id: 4,
        kind: "SINGLE_PROPERTY",
        status: "ENABLED",
        enabled: true,
        properties: [
          { id: 30, bookingId: 20, title: "Synthetic Tower", fileCount: 2 },
        ],
        analytics: {
          totalRequestViews: 12,
          lastViewedAt: "2026-07-22T10:00:00.000Z",
          trailing30Days: emptySeries,
        },
        contacts: [
          {
            id: 1,
            propertyTitle: "Synthetic Tower",
            name: "Synthetic Visitor",
            phone: "+971500000000",
            createdAt: "2026-07-22T10:00:00.000Z",
          },
        ],
      },
    ],
  };
}

describe("PropertySharingManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDashboard.mockResolvedValue({ success: true, data: data() });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows single/master management, request-view labeling, state controls, and contacts", () => {
    render(<PropertySharingManager initialData={data()} />);

    expect(screen.getByText("Share completed properties")).toBeInTheDocument();
    expect(screen.getByText("Single-property links")).toBeInTheDocument();
    expect(screen.getByText("Master link")).toBeInTheDocument();
    expect(
      screen.getByText("Requests, not unique visitors"),
    ).toBeInTheDocument();
    expect(screen.getByText("Synthetic Visitor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rotate link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh snapshot" }),
    ).toBeInTheDocument();
  });

  it("reveals a newly issued URL only through the copy-once control", async () => {
    const publicUrl = "https://example.test/share/redacted-token-value";
    mockCreateSingle.mockResolvedValue({
      success: true,
      data: { shareId: 8, publicUrl },
    });
    const initial = data();
    initial.shares = [];
    render(<PropertySharingManager initialData={initial} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Create link" })[0]);

    expect(
      await screen.findByText("New secure URL is ready"),
    ).toBeInTheDocument();
    expect(screen.queryByText(publicUrl)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy secure URL" }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(publicUrl),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("New secure URL is ready"),
      ).not.toBeInTheDocument(),
    );
  });

  it("drops stale master members from the editable selection", () => {
    const initial = data();
    initial.shares = [
      {
        ...initial.shares[0],
        kind: "MASTER",
        properties: [
          { id: 30, bookingId: 20, title: "Synthetic Tower", fileCount: 2 },
          { id: 31, bookingId: 99, title: "Stale Property", fileCount: 1 },
        ],
      },
    ];

    render(<PropertySharingManager initialData={initial} />);

    expect(
      screen.getByRole("checkbox", { name: "Synthetic Tower" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Sample Villa" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Update master snapshot" }),
    ).toBeDisabled();
  });
});
