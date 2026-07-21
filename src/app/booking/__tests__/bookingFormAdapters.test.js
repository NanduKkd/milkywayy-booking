import {
  mapDraftsToBookingProperties,
  mapHandoffToBookingProperties,
} from "../bookingFormAdapters";

describe("booking form adapters", () => {
  it("maps normal drafts into canonical form values", () => {
    const [property] = mapDraftsToBookingProperties([
      {
        id: 17,
        propertyDetails: {
          type: "Apartment",
          size: "2 Bed",
          building: "Draft Tower",
          community: "Draft District",
          unit: "702",
        },
        shootDetails: {
          services: ["Photography"],
          videographySubService: "",
        },
        date: "2026-08-02",
        slot: 2,
        duration: 3,
        contactDetails: {
          name: "Draft Customer",
          phone: "+971500000001",
          email: "draft@example.test",
        },
      },
    ]);

    expect(property).toEqual(
      expect.objectContaining({
        localId: "17",
        propertyType: "Apartment",
        propertySize: "2 Bed",
        services: ["Photography"],
        preferredDate: "2026-08-02",
        timeSlot: "afternoon",
        startTime: "13:00",
        duration: 3,
        building: "Draft Tower",
        community: "Draft District",
        unitNumber: "702",
        contactName: "Draft Customer",
        contactPhone: "+971500000001",
        contactEmail: "draft@example.test",
      }),
    );
  });

  it("maps every prepared handoff field and customer contact into canonical values", () => {
    const [property] = mapHandoffToBookingProperties(
      [
        {
          propertyType: "Villa",
          propertySize: "4 Bedroom",
          services: ["Photography", "Videography"],
          videographySubService: "Short Form|Long Form.Daylight",
          preferredDate: "2026-08-03",
          timeSlot: "morning",
          startTime: "10:30",
          duration: 5,
          building: "Synthetic Villas",
          community: "Test Community",
          unitNumber: "V-12",
        },
      ],
      {
        accountType: "COMPANY",
        companyName: "Synthetic Media LLC",
        fullName: "Test Contact",
        phone: "+971500000002",
        email: "handoff@example.test",
      },
      "handoff-61",
    );

    expect(property).toEqual({
      localId: "handoff-61-property-1",
      propertyType: "Villa",
      propertySize: "4 Bedroom",
      services: ["Photography", "Videography"],
      videographySubService: "Short Form|Long Form.Daylight",
      preferredDate: "2026-08-03",
      timeSlot: "morning",
      startTime: "10:30",
      duration: 5,
      building: "Synthetic Villas",
      community: "Test Community",
      unitNumber: "V-12",
      contactName: "Synthetic Media LLC",
      contactPhone: "+971500000002",
      contactEmail: "handoff@example.test",
    });
  });
});
