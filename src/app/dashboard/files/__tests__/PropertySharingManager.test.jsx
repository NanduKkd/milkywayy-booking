import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PropertySharingManager from "../PropertySharingManager";

const mockCreateMaster = jest.fn();
const mockCreateSingle = jest.fn();
const mockGetDashboard = jest.fn();
const mockSaveListing = jest.fn();

jest.mock("@/lib/actions/propertySharing", () => ({
  createMasterPropertyShareAction: (...args) => mockCreateMaster(...args),
  createSinglePropertyShareAction: (...args) => mockCreateSingle(...args),
  getPropertySharingDashboardAction: (...args) => mockGetDashboard(...args),
  savePropertyShareListingAction: (...args) => mockSaveListing(...args),
  setPropertyShareEnabledAction: jest.fn(),
  updateMasterPropertyShareAction: jest.fn(),
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

function data({ withShares = true } = {}) {
  return {
    eligibleProperties: [
      eligibleProperty(20, { listing: withShares ? listing : null }),
      eligibleProperty(21, { listing: withShares ? listing : null }),
      eligibleProperty(22),
    ],
    shares: withShares ? [share(4, 20), share(5, 21)] : [],
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
    mockCreateSingle.mockResolvedValue({
      success: true,
      data: {
        shareId: 8,
        publicUrl: "https://example.test/share/redacted-token-value",
      },
    });
    mockCreateMaster.mockResolvedValue({
      success: true,
      data: {
        shareId: 9,
        publicUrl: "https://example.test/share/redacted-master-token",
      },
    });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("matches the Ready, Shared Properties, Master Links, and aggregate management contract", () => {
    render(<PropertySharingManager initialData={data()} />);

    expect(screen.getByText("READY TO SHARE")).toBeInTheDocument();
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

  it("collects owner listing and contact configuration without assignment UI", () => {
    const initial = data();
    render(<PropertySharingManager initialData={initial} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Share Link" }));

    expect(
      screen.getByRole("form", { name: "Create property listing" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("LISTING TITLE *")).toBeInTheDocument();
    expect(screen.getByLabelText("PRICE (AED) *")).toBeInTheDocument();
    expect(screen.getByLabelText("LISTING TYPE *")).toBeInTheDocument();
    expect(screen.getByLabelText("BATHROOMS")).toBeInTheDocument();
    expect(screen.getByLabelText("SIZE (SQFT)")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "FURNISHING *" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("DESCRIPTION")).toBeInTheDocument();
    expect(screen.getByLabelText("CONTACT NAME *")).toBeInTheDocument();
    expect(screen.getByLabelText("CONTACT PHONE *")).toBeInTheDocument();
    expect(screen.queryByText(/ASSIGN TO AGENTS/u)).not.toBeInTheDocument();
  });

  it("saves listing configuration and creates a stable copied link", async () => {
    const initial = data({ withShares: false });
    mockGetDashboard.mockResolvedValue({ success: true, data: initial });
    render(<PropertySharingManager initialData={initial} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Create Share Link" })[0],
    );
    fireEvent.change(screen.getByLabelText("PRICE (AED) *"), {
      target: { value: "2350000" },
    });
    fireEvent.change(screen.getByLabelText("CONTACT NAME *"), {
      target: { value: "Synthetic Owner" },
    });
    fireEvent.change(screen.getByLabelText("CONTACT PHONE *"), {
      target: { value: "+971500000000" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Generate & Copy Link" }),
    );

    await waitFor(() => expect(mockSaveListing).toHaveBeenCalled());
    expect(mockCreateSingle).toHaveBeenCalledWith(20);
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://example.test/share/redacted-token-value",
      ),
    );
  });

  it("supports selecting multiple shared properties for a master collection", async () => {
    render(<PropertySharingManager initialData={data()} />);

    fireEvent.click(screen.getByRole("button", { name: "Select Multiple" }));
    const selectors = screen.getAllByLabelText(/master collection/u);
    fireEvent.click(selectors[0]);
    fireEvent.click(selectors[1]);

    const create = screen.getByRole("button", { name: "Create Master Link" });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() =>
      expect(mockCreateMaster).toHaveBeenCalledWith([20, 21]),
    );
  });
});
