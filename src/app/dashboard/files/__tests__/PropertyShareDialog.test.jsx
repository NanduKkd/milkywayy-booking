import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createSinglePropertyShareAction,
  getPropertySharingDashboardAction,
  savePropertyShareListingAction,
  setPropertyShareEnabledAction,
} from "@/lib/actions/propertySharing";
import PropertyShareDialog from "../PropertyShareDialog";

const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/lib/actions/propertySharing", () => ({
  createSinglePropertyShareAction: jest.fn(),
  getPropertySharingDashboardAction: jest.fn(),
  savePropertyShareListingAction: jest.fn(),
  setPropertyShareEnabledAction: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const property = {
  id: 20,
  bookingTitle: "Creek Edge, Dubai Creek Harbour",
  location: "Dubai Creek Harbour",
  bedrooms: 2,
  mediaCount: 1,
  listing: null,
};

const listing = {
  listingTitle: "Creek Edge, Dubai Creek Harbour",
  priceAed: "2350000.00",
  listingType: "FOR_SALE",
  listingTypeLabel: "For Sale",
  bathrooms: 3,
  sizeSqft: 1244,
  furnishing: "FURNISHED",
  furnishingLabel: "Furnished",
  description: "Bright corner home.",
  highlights: ["Creek view"],
  contactName: "Synthetic Owner",
  contactPhone: "+971500000000",
};

const share = {
  id: 4,
  kind: "SINGLE_PROPERTY",
  enabled: true,
  publicUrl: `https://example.test/share/${"a".repeat(43)}`,
  linkViews: 12,
  properties: [{ bookingId: 20, ...property, listing }],
};

describe("PropertyShareDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    savePropertyShareListingAction.mockResolvedValue({
      success: true,
      data: { bookingId: 20 },
    });
    createSinglePropertyShareAction.mockResolvedValue({
      success: true,
      data: { shareId: 4, publicUrl: share.publicUrl },
    });
    getPropertySharingDashboardAction.mockResolvedValue({
      success: true,
      data: {
        eligibleProperties: [{ ...property, listing }],
        shares: [share],
      },
    });
    setPropertyShareEnabledAction.mockResolvedValue({
      success: true,
      data: { shareId: 4, enabled: false },
    });
  });

  it("opens directly in listing creation for an unshared completed project", async () => {
    render(
      <PropertyShareDialog
        initialData={{ eligibleProperties: [property], shares: [] }}
        bookingId={20}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("form", { name: "Create property listing" }),
    ).toBeInTheDocument();

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

    await waitFor(() =>
      expect(savePropertyShareListingAction).toHaveBeenCalled(),
    );
    expect(createSinglePropertyShareAction).toHaveBeenCalledWith(20);
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        share.publicUrl,
      ),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("opens contextual controls for an existing share link", () => {
    render(
      <PropertyShareDialog
        initialData={{
          eligibleProperties: [{ ...property, listing }],
          shares: [share],
        }}
        bookingId={20}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Manage property share link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Link" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  });
});
