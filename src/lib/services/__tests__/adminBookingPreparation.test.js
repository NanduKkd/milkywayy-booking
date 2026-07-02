import User from "@/lib/db/models/user";
import { getPricingConfig } from "@/lib/helpers/pricing";
import {
  assertBookingPropertiesAvailable,
  buildPreparedPropertySummary,
} from "@/lib/services/bookingPreparation";
import {
  previewAdminBookingPreparation,
  searchAdminBookingPreparationCustomers,
} from "../adminBookingPreparation";

jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

jest.mock("@/lib/db/models/user", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("@/lib/services/bookingPreparation", () => ({
  assertBookingPropertiesAvailable: jest.fn(),
  buildPreparedPropertySummary: jest.fn(),
}));

describe("adminBookingPreparation service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPricingConfig.mockResolvedValue({ Apartment: { sizes: [] } });
    assertBookingPropertiesAvailable.mockResolvedValue({
      timeSlotConfig: { systemSettings: {} },
    });
    buildPreparedPropertySummary.mockImplementation((property) => ({
      propertyType: property.propertyType,
      propertySize: property.propertySize,
      services: property.services,
      videographySubService: property.videographySubService || "",
      preferredDate: property.preferredDate,
      startTime: property.startTime,
      durationHours: 2,
      total: 1450,
      building: property.building,
      community: property.community,
      unitNumber: property.unitNumber,
      arrivalWindow: "09:00 - 09:30",
    }));
  });

  it("searches existing customers for a super admin", async () => {
    User.findAll.mockResolvedValue([
      {
        id: 7,
        accountType: "INDIVIDUAL",
        fullName: "Ava Agent",
        companyName: null,
        billingAddress: null,
        trn: null,
        email: "ava@example.com",
        phone: "+971500000001",
      },
    ]);

    const result = await searchAdminBookingPreparationCustomers({
      actorUser: { id: 1, role: "SUPERADMIN" },
      query: "ava",
    });

    expect(User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "CUSTOMER",
        }),
        limit: 8,
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        displayName: "Ava Agent",
        email: "ava@example.com",
      }),
    ]);
  });

  it("builds a validated multi-property preview for an existing customer", async () => {
    User.findOne.mockResolvedValue({
      id: 8,
      accountType: "COMPANY",
      fullName: "Noura Buyer",
      companyName: "Noura Realty",
      billingAddress: "Dubai Hills Business Park",
      trn: "TRN-18",
      email: "noura@example.com",
      phone: "+971500000018",
    });

    const result = await previewAdminBookingPreparation({
      actorUser: { id: 1, role: "SUPERADMIN" },
      input: {
        customerMode: "existing",
        customerId: 8,
        properties: [
          {
            propertyType: "Apartment",
            propertySize: "2 Bed",
            services: ["Photography", "Videography"],
            videographySubService: "Short Form",
            preferredDate: "2099-07-20",
            startTime: "09:00",
            building: "Marina Gate",
            community: "Dubai Marina",
            unitNumber: "1504",
          },
        ],
      },
    });

    expect(assertBookingPropertiesAvailable).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          propertyType: "Apartment",
          preferredDate: "2099-07-20",
        }),
      ],
      [],
      { transaction: null },
    );
    expect(buildPreparedPropertySummary).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        customerMode: "existing",
        requiresRegistration: false,
        totalAmount: 1450,
        customer: expect.objectContaining({
          id: 8,
          displayName: "Noura Realty",
        }),
        properties: [
          expect.objectContaining({
            label: "2 Bed Apartment",
            locationLabel: "1504, Marina Gate, Dubai Marina",
            serviceLabel: "Photography, Videography (Short Form)",
          }),
        ],
      }),
    );
  });

  it("builds a validated preview for a new customer handoff candidate", async () => {
    const result = await previewAdminBookingPreparation({
      actorUser: { id: 1, role: "SUPERADMIN" },
      input: {
        customerMode: "new",
        customer: {
          accountType: "INDIVIDUAL",
          fullName: "Lina Client",
          phone: "+971500000099",
          email: "",
        },
        properties: [
          {
            propertyType: "Apartment",
            propertySize: "1 Bed",
            services: ["Photography"],
            preferredDate: "2099-07-21",
            startTime: "13:00",
            building: "Park Heights",
            community: "Dubai Hills",
            unitNumber: "803",
          },
        ],
      },
    });

    expect(result.requiresRegistration).toBe(true);
    expect(result.customer).toEqual(
      expect.objectContaining({
        id: null,
        fullName: "Lina Client",
        phone: "+971500000099",
      }),
    );
  });

  it("rejects unauthorized actors", async () => {
    await expect(
      searchAdminBookingPreparationCustomers({
        actorUser: { id: 3, role: "CUSTOMER" },
        query: "ava",
      }),
    ).rejects.toThrow(
      "Unauthorized: Scheduling calendar admin access required",
    );
  });
});
