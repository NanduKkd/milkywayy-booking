import { auth } from "@/lib/helpers/auth";
import {
  createSinglePropertyShare,
  getPropertySharingDashboard,
  savePropertyShareListing,
  setPropertyShareEnabled,
} from "@/lib/services/propertySharing";
import {
  createSinglePropertyShareAction,
  getPropertySharingDashboardAction,
  savePropertyShareListingAction,
  setPropertyShareEnabledAction,
} from "../propertySharing";

jest.mock("@/lib/helpers/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/services/propertySharing", () => ({
  createMasterPropertyShare: jest.fn(),
  createSinglePropertyShare: jest.fn(),
  getPropertySharingDashboard: jest.fn(),
  savePropertyShareListing: jest.fn(),
  setPropertyShareEnabled: jest.fn(),
  updateMasterPropertyShare: jest.fn(),
}));

describe("property sharing server actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 7, role: "CUSTOMER" });
  });

  it("takes owner identity only from the authenticated session", async () => {
    createSinglePropertyShare.mockResolvedValue({ shareId: 4 });

    const result = await createSinglePropertyShareAction(20);

    expect(result.success).toBe(true);
    expect(createSinglePropertyShare).toHaveBeenCalledWith(7, 20);
  });

  it("returns the owner-scoped dashboard and toggle state", async () => {
    getPropertySharingDashboard.mockResolvedValue({
      eligibleProperties: [],
      shares: [],
    });
    setPropertyShareEnabled.mockResolvedValue({ shareId: 4, enabled: false });

    await expect(getPropertySharingDashboardAction()).resolves.toEqual(
      expect.objectContaining({ success: true }),
    );
    await expect(setPropertyShareEnabledAction(4, false)).resolves.toEqual(
      expect.objectContaining({ success: true }),
    );
    expect(getPropertySharingDashboard).toHaveBeenCalledWith(7);
    expect(setPropertyShareEnabled).toHaveBeenCalledWith(7, 4, false);
  });

  it("passes owner-authored listing configuration through the authenticated boundary", async () => {
    const listing = {
      listingTitle: "Synthetic listing",
      contactName: "Synthetic Owner",
      contactPhone: "+971500000000",
    };
    savePropertyShareListing.mockResolvedValue({ bookingId: 20, listing });

    const result = await savePropertyShareListingAction(20, listing);

    expect(result.success).toBe(true);
    expect(savePropertyShareListing).toHaveBeenCalledWith(7, 20, listing);
  });

  it("does not call the service without a customer session", async () => {
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await createSinglePropertyShareAction(20);

    expect(result).toEqual(
      expect.objectContaining({ success: false, message: "Unauthorized" }),
    );
    expect(createSinglePropertyShare).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledTimes(1);
    errorLog.mockRestore();
  });
});
