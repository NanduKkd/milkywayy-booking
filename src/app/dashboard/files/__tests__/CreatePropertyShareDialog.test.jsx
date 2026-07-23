import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CreatePropertyShareDialog from "../CreatePropertyShareDialog";

const mockCreateSingle = jest.fn();
const mockRefresh = jest.fn();
const mockSaveListing = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/lib/actions/propertySharing", () => ({
  createSinglePropertyShareAction: (...args) => mockCreateSingle(...args),
  savePropertyShareListingAction: (...args) => mockSaveListing(...args),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const property = {
  id: 20,
  bookingTitle: "Synthetic Tower, Test District",
  location: "Synthetic Tower, Test District",
  bedrooms: 2,
  listing: null,
};

describe("CreatePropertyShareDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("collects listing details and creates the stable link from the file card", async () => {
    const onClose = jest.fn();
    render(<CreatePropertyShareDialog property={property} onClose={onClose} />);

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
      expect(mockSaveListing).toHaveBeenCalledWith(
        20,
        expect.objectContaining({
          listingTitle: "Synthetic Tower, Test District",
          priceAed: "2350000",
          contactName: "Synthetic Owner",
          contactPhone: "+971500000000",
        }),
      ),
    );
    expect(mockCreateSingle).toHaveBeenCalledWith(20);
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://example.test/share/redacted-token-value",
      ),
    );
    expect(onClose).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });
});
