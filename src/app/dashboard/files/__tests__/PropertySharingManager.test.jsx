import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PropertySharingManager, { ListingForm } from "../PropertySharingManager";

const mockCreateMaster = jest.fn();
const mockCreateSingle = jest.fn();
const mockDeleteContact = jest.fn();
const mockGetDashboard = jest.fn();
const mockSaveContact = jest.fn();
const mockSaveListing = jest.fn();
const mockSaveMedia = jest.fn();
const mockSetEnabled = jest.fn();
const mockUpdateMaster = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/lib/actions/propertySharing", () => ({
  createMasterPropertyShareAction: (...args) => mockCreateMaster(...args),
  createSinglePropertyShareAction: (...args) => mockCreateSingle(...args),
  deletePropertyContactAction: (...args) => mockDeleteContact(...args),
  getPropertySharingDashboardAction: (...args) => mockGetDashboard(...args),
  savePropertyContactAction: (...args) => mockSaveContact(...args),
  savePropertyMediaPreferencesAction: (...args) => mockSaveMedia(...args),
  savePropertyShareListingAction: (...args) => mockSaveListing(...args),
  setPropertyShareEnabledAction: (...args) => mockSetEnabled(...args),
  updateMasterPropertyShareAction: (...args) => mockUpdateMaster(...args),
}));
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: (...args) => mockToastError(...args),
    info: jest.fn(),
  },
}));
jest.mock(
  "@/components/customer-delivery/ServiceDeliveryModal",
  () =>
    function MockServiceDeliveryModal({ booking, open }) {
      return open ? <div>Download files for booking {booking.id}</div> : null;
    },
);

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
    coverUrl: `/api/files/download?fileId=${id}`,
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
    mockCreateSingle.mockResolvedValue({
      success: true,
      data: { publicUrl: "https://example.test/share/redacted-single-token" },
    });
    mockSetEnabled.mockResolvedValue({ success: true, data: {} });
    mockSaveContact.mockResolvedValue({ success: true, data: {} });
    mockSaveMedia.mockResolvedValue({ success: true, data: {} });
    mockDeleteContact.mockResolvedValue({ success: true, data: {} });
    mockUpdateMaster.mockResolvedValue({ success: true, data: {} });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows ready properties before the full-width shared-property cards", () => {
    render(<PropertySharingManager initialData={data()} />);

    expect(screen.getByText("READY TO SHARE")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Share Link" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SHARED PROPERTIES")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Master Links (0)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Multiple" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/link views/u)).toHaveLength(2);
    expect(screen.getAllByText(/2 photos · 1 video/u)).toHaveLength(2);
    expect(screen.getByAltText("Sample Villa cover")).toHaveAttribute(
      "src",
      "/api/files/download?fileId=22",
    );
    expect(screen.getAllByLabelText(/Preview Corner home/u)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /View Page/u })).toHaveLength(
      2,
    );
    expect(
      screen.queryByRole("button", { name: /rotate|revoke/u }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Refresh Media" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Recent contacts/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/agent/u)).not.toBeInTheDocument();
  });

  it("has no manual media refresh dependency on property cards", () => {
    render(<PropertySharingManager initialData={data()} />);

    expect(
      screen.queryByRole("button", { name: /refresh media/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it("matches the reference create form amenities and enforces six selections", () => {
    const property = eligibleProperty(22, { media: [] });
    render(
      <ListingForm
        property={property}
        mode="create"
        busy={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        onSaveDraft={jest.fn()}
        onPreview={jest.fn()}
      />,
    );

    expect(screen.getByText("Create Share Link")).toBeInTheDocument();
    expect(
      screen.getByText("AMENITIES & HIGHLIGHTS · 0/6"),
    ).toBeInTheDocument();
    for (const amenity of [
      "Sea view",
      "Golf view",
      "Balcony",
      "Private pool",
      "Shared pool",
      "Covered parking",
      "Chiller free",
    ]) {
      expect(screen.getByRole("button", { name: amenity })).toBeInTheDocument();
    }

    for (const amenity of [
      "Sea view",
      "Golf view",
      "Balcony",
      "Private pool",
      "Shared pool",
      "Covered parking",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: amenity }));
    }
    expect(
      screen.getByText("AMENITIES & HIGHLIGHTS · 6/6"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Chiller free" }));
    expect(mockToastError).toHaveBeenCalledWith(
      "Maximum 6 highlights per property",
    );
    expect(
      screen.getByRole("button", { name: "Chiller free" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("renders photo ordering and submits reordered visibility preferences", () => {
    const onSubmit = jest.fn();
    const property = eligibleProperty(22, {
      listing,
      media: [
        {
          deliveryFileId: 101,
          kind: "IMAGE",
          label: "Lobby",
          visible: true,
          isCover: true,
        },
        {
          deliveryFileId: 102,
          kind: "IMAGE",
          label: "Balcony",
          visible: true,
          isCover: false,
        },
        {
          deliveryFileId: 103,
          kind: "VIDEO",
          label: "Walkthrough",
          visible: true,
          isCover: false,
        },
      ],
    });
    render(
      <ListingForm
        property={property}
        mode="edit"
        busy={false}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        onSaveDraft={jest.fn()}
        onPreview={jest.fn()}
      />,
    );

    expect(screen.getByText("Edit Share Link")).toBeInTheDocument();
    expect(screen.getByText("PHOTO ORDER · 2 PHOTOS")).toBeInTheDocument();
    expect(screen.getByText("Video walkthrough")).toBeInTheDocument();
    expect(screen.getByText("COVER")).toBeInTheDocument();

    const lobby = screen.getByAltText("Lobby").closest("li");
    const balcony = screen.getByAltText("Balcony").closest("li");
    fireEvent.dragStart(balcony);
    fireEvent.dragOver(lobby);
    fireEvent.drop(lobby);
    fireEvent.click(screen.getByRole("button", { name: "Hide Lobby" }));
    fireEvent.click(screen.getByRole("button", { name: "Update & Copy Link" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        media: [
          expect.objectContaining({
            deliveryFileId: 102,
            visible: true,
            isCover: true,
          }),
          expect.objectContaining({
            deliveryFileId: 101,
            visible: false,
            isCover: false,
          }),
          expect.objectContaining({ deliveryFileId: 103 }),
        ],
      }),
    );
  });

  it("shows saved contacts below the save action and highlights the selected contact", () => {
    const property = eligibleProperty(22, { media: [] });
    render(
      <ListingForm
        property={property}
        savedContacts={[
          { id: 1, name: "Arunima TK", phone: "+971500000001" },
          { id: 2, name: "Nanda Krishnan", phone: "+971500000002" },
        ]}
        mode="create"
        busy={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        onSaveDraft={jest.fn()}
        onPreview={jest.fn()}
      />,
    );

    const saveContact = screen.getByRole("button", {
      name: "+ Save this contact",
    });
    const savedContactsLabel = screen.getByText("SAVED CONTACTS");
    expect(
      saveContact.compareDocumentPosition(savedContactsLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const nanda = screen.getByRole("button", { name: "Nanda Krishnan" });
    expect(nanda).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(nanda);

    expect(
      screen.getByRole("button", { name: "✓ Nanda Krishnan" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("NAME *")).toHaveValue("Nanda Krishnan");
    expect(screen.getByLabelText("PHONE *")).toHaveValue("+971500000002");

    fireEvent.change(screen.getByLabelText("PHONE *"), {
      target: { value: "+971500000003" },
    });
    expect(
      screen.getByRole("button", { name: "Nanda Krishnan" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("opens the authenticated download and review modal from a ready property", () => {
    const booking = {
      id: 22,
      propertyDetails: { community: "Palm District" },
      deliveryFiles: [],
      serviceGroups: [],
    };
    render(
      <PropertySharingManager initialData={data()} bookings={[booking]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "↓ Download Files" }));

    expect(
      screen.getByText("Download files for booking 22"),
    ).toBeInTheDocument();
  });

  it("reconciles refreshed server data after a share is created from the file list", async () => {
    const initial = data({ withShares: false });
    const refreshed = data();
    const { rerender } = render(
      <PropertySharingManager initialData={initial} />,
    );

    expect(screen.getByText("No shared properties yet.")).toBeInTheDocument();

    rerender(<PropertySharingManager initialData={refreshed} />);

    await waitFor(() =>
      expect(
        screen.getAllByRole("button", {
          name: "Preview Corner home with full marina view",
        }),
      ).toHaveLength(2),
    );
    expect(
      screen.queryByText("No shared properties yet."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Multiple" }),
    ).toBeInTheDocument();
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

    expect(
      screen.queryByRole("button", { name: /refresh media/i }),
    ).not.toBeInTheDocument();
  });
});
