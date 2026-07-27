import { render } from "@testing-library/react";
import FilesPage from "../page";

const mockAuth = jest.fn();
const mockGetBookings = jest.fn();
const mockGetPropertySharingDashboard = jest.fn();
const mockPropertySharingManager = jest.fn();

jest.mock("@/lib/helpers/auth", () => ({
  auth: (...args) => mockAuth(...args),
}));

jest.mock("@/lib/actions/bookings", () => ({
  getBookings: (...args) => mockGetBookings(...args),
}));

jest.mock("@/lib/services/propertySharing", () => ({
  getPropertySharingDashboard: (...args) =>
    mockGetPropertySharingDashboard(...args),
}));

jest.mock("../PropertySharingManager", () => ({
  __esModule: true,
  default: (props) => {
    mockPropertySharingManager(props);
    return <div data-testid="property-sharing-manager" />;
  },
}));

describe("dashboard files page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPropertySharingDashboard.mockResolvedValue({
      eligibleProperties: [],
      shares: [],
    });
  });

  it("returns null when the visitor is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(FilesPage()).resolves.toBeNull();

    expect(mockGetBookings).not.toHaveBeenCalled();
    expect(mockGetPropertySharingDashboard).not.toHaveBeenCalled();
  });

  it("passes the canonical files projection to the Properties manager and filters hidden replacements", async () => {
    mockAuth.mockResolvedValue({
      id: 42,
    });
    mockGetBookings.mockResolvedValue({
      success: true,
      data: [
        {
          toJSON: () => ({
            id: 7,
            propertyDetails: {
              unit: "1203",
            },
            deliveryFiles: [
              {
                id: 18,
                label: "Exterior photo set",
                type: "Photography",
                status: "UNDER_REVIEW",
                currentVersion: {
                  originalFilename: "front-elevation.jpg",
                },
              },
              {
                id: 19,
                label: "Old replacement",
                type: "Photography",
                status: "CHANGES_REQUESTED",
              },
            ],
          }),
        },
      ],
    });

    render(await FilesPage());

    expect(mockGetBookings).toHaveBeenCalledWith(42);
    expect(mockGetPropertySharingDashboard).toHaveBeenCalledWith(42);
    expect(mockPropertySharingManager).toHaveBeenCalledWith({
      initialData: { eligibleProperties: [], shares: [] },
      bookings: [
        expect.objectContaining({
          deliveryFiles: [
            expect.objectContaining({
              id: 18,
            }),
          ],
          id: 7,
          pendingReplacementCount: 1,
        }),
      ],
    });
  });

  it("does not consume a dashboard fileId query value", async () => {
    mockAuth.mockResolvedValue({
      id: 42,
    });
    mockGetBookings.mockResolvedValue({
      success: true,
      data: [
        {
          toJSON: () => ({
            id: 7,
            deliveryFiles: [],
          }),
        },
      ],
    });

    render(
      await FilesPage({
        searchParams: Promise.resolve({
          fileId: "not-a-number",
        }),
      }),
    );

    expect(mockPropertySharingManager).toHaveBeenCalledWith({
      initialData: { eligibleProperties: [], shares: [] },
      bookings: [],
    });
  });
});
