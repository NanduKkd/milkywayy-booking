import { render } from "@testing-library/react";
import FilesPage from "../page";

const mockAuth = jest.fn();
const mockGetBookings = jest.fn();
const mockFileList = jest.fn();
const mockGetPropertySharingDashboard = jest.fn();

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

jest.mock("../FileList", () => ({
  __esModule: true,
  default: (props) => {
    mockFileList(props);
    return <div data-testid="files-page-list" />;
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

  it("returns null when the visitor is not authenticated so the dashboard gate can preserve the target path", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      FilesPage({
        searchParams: Promise.resolve({
          fileId: "18",
        }),
      }),
    ).resolves.toBeNull();

    expect(mockGetBookings).not.toHaveBeenCalled();
    expect(mockGetPropertySharingDashboard).not.toHaveBeenCalled();
    expect(mockFileList).not.toHaveBeenCalled();
  });

  it("passes the requested owned file through to FileList and filters hidden replacements", async () => {
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

    render(
      await FilesPage({
        searchParams: Promise.resolve({
          fileId: "18",
        }),
      }),
    );

    expect(mockGetBookings).toHaveBeenCalledWith(42);
    expect(mockGetPropertySharingDashboard).toHaveBeenCalledWith(42);
    expect(mockFileList.mock.calls[0][0]).toEqual({
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
      highlightedFileId: 18,
      propertySharing: { eligibleProperties: [], shares: [] },
      requestedFileAvailable: true,
      requestedFileIdWasProvided: true,
    });
  });

  it("marks invalid or inaccessible fileId values as unavailable without disclosing existence", async () => {
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

    expect(mockFileList.mock.calls[0][0]).toEqual({
      bookings: [],
      highlightedFileId: null,
      propertySharing: { eligibleProperties: [], shares: [] },
      requestedFileAvailable: false,
      requestedFileIdWasProvided: true,
    });
  });
});
