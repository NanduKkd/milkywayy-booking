import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PropertySharingManager from "../PropertySharingManager";

const mockCreateMaster = jest.fn();
const mockGetDashboard = jest.fn();
const mockSaveListing = jest.fn();
const mockSetEnabled = jest.fn();
const mockUpdateMaster = jest.fn();

jest.mock("@/lib/actions/propertySharing", () => ({
  createMasterPropertyShareAction: (...args) => mockCreateMaster(...args),
  getPropertySharingDashboardAction: (...args) => mockGetDashboard(...args),
  savePropertyShareListingAction: (...args) => mockSaveListing(...args),
  setPropertyShareEnabledAction: (...args) => mockSetEnabled(...args),
  updateMasterPropertyShareAction: (...args) => mockUpdateMaster(...args),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const listing = {
  listingTitle: "Corner home with full marina view",
  priceAed: "2350000.00",
  listingType: "FOR_SALE",
  listingTypeLabel: "For Sale",
  bathrooms: 3,
  sizeSqft: 1244,
  furnishing: "FURNISHED",
  furnishingLabel: "Furnished",
  description: "Bright corner home near the marina.",
  highlights: ["Full marina view", "Upgraded kitchen"],
  contactName: "Synthetic Owner",
  contactPhone: "+971500000000",
};

function eligibleProperty(id, overrides = {}) {
  return {
    id,
    bookingTitle: id === 20 ? "Synthetic Tower, Test District" : "Sample Villa",
    location: id === 20 ? "Synthetic Tower, Test District" : "Palm District",
    bedrooms: 2,
    completedAt: "2026-07-20T10:00:00.000Z",
    mediaCount: 3,
    imageCount: 2,
    hasVideo: true,
    hasTour: false,
    listing: null,
    ...overrides,
  };
}

function share(id, bookingId) {
  const property = eligibleProperty(bookingId, { listing });
  return {
    id,
    kind: "SINGLE_PROPERTY",
    status: "ENABLED",
    enabled: true,
    publicUrl: `https://example.test/share/${"a".repeat(42)}${id}`,
    linkViews: id === 4 ? 12 : 7,
    properties: [
      {
        id: id + 100,
        bookingId,
        ...property,
      },
    ],
  };
}

function data({ withShares = true, master = null } = {}) {
  return {
    eligibleProperties: [
      eligibleProperty(20, { listing: withShares ? listing : null }),
      eligibleProperty(21, { listing: withShares ? listing : null }),
      eligibleProperty(22),
    ],
    shares: withShares
      ? [share(4, 20), share(5, 21), ...(master ? [master] : [])]
      : [],
  };
}

describe("PropertySharingManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDashboard.mockResolvedValue({ success: true, data: data() });
    mockSaveListing.mockResolvedValue({
      success: true,
      data: { bookingId: 20 },
    });
    mockCreateMaster.mockResolvedValue({
      success: true,
      data: {
        shareId: 9,
        publicUrl: "https://example.test/share/redacted-master-token",
      },
    });
    mockSetEnabled.mockResolvedValue({ success: true, data: {} });
    mockUpdateMaster.mockResolvedValue({ success: true, data: {} });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("keeps Shared Properties and Master Links management above the file list without a Ready section", () => {
    render(<PropertySharingManager initialData={data()} />);

    expect(screen.queryByText("READY TO SHARE")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create Share Link" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("SHARED PROPERTIES")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Master Links (0)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Multiple" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/link views/u)).toHaveLength(2);
    expect(screen.getAllByLabelText(/Preview Corner home/u)).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: /rotate|revoke|refresh/u }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Recent contacts/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/agent/u)).not.toBeInTheDocument();
  });

  it("toggles the visible check controls and creates a master collection", async () => {
    render(<PropertySharingManager initialData={data()} />);

    fireEvent.click(screen.getByRole("button", { name: "Select Multiple" }));
    const selectors = screen
      .getAllByRole("button", { name: /to master collection/u })
      .filter((button) => button.className.includes("selectCheck"));
    expect(selectors).toHaveLength(2);
    fireEvent.click(selectors[0]);
    fireEvent.click(selectors[1]);

    const create = screen.getByRole("button", { name: "Create Master Link" });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() =>
      expect(mockCreateMaster).toHaveBeenCalledWith([20, 21]),
    );
  });

  it("shows and manages the existing multi-property master link", async () => {
    const master = {
      id: 9,
      kind: "MASTER",
      status: "ENABLED",
      enabled: true,
      publicUrl: "https://example.test/share/redacted-master-token",
      linkViews: 9,
      properties: [
        { id: 201, bookingId: 20, ...eligibleProperty(20, { listing }) },
        { id: 202, bookingId: 21, ...eligibleProperty(21, { listing }) },
      ],
    };
    const initial = data({ master });
    mockGetDashboard.mockResolvedValue({ success: true, data: initial });
    render(<PropertySharingManager initialData={initial} />);

    fireEvent.click(screen.getByRole("button", { name: "Master Links (1)" }));

    expect(screen.getByText("MASTER LINKS")).toBeInTheDocument();
    expect(screen.getByText("Collection — 2 properties")).toBeInTheDocument();
    expect(screen.getByText("9 views")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        master.publicUrl,
      ),
    );
  });
});
