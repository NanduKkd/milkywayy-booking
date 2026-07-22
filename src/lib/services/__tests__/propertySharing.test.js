/** @jest-environment node */

import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import PropertyShareDailyView from "@/lib/db/models/propertysharedailyview";
import PropertyShareFile from "@/lib/db/models/propertysharefile";
import PropertyShareLink from "@/lib/db/models/propertysharelink";
import PropertyShareListing from "@/lib/db/models/propertysharelisting";
import PropertyShareProperty from "@/lib/db/models/propertyshareproperty";
import User from "@/lib/db/models/user";
import {
  createMasterPropertyShare,
  createSinglePropertyShare,
  getInlinePropertyMediaDetails,
  getPropertySharingDashboard,
  PropertyShareConflictError,
  PropertyShareNotFoundError,
  resolvePublicPropertyShareLanding,
  resolvePublicPropertyShareMedia,
  rotatePropertyShareToken,
  savePropertyShareListing,
  setPropertyShareEnabled,
} from "../propertySharing";
import {
  createPropertyShareToken,
  digestPropertyShareToken,
} from "../propertySharingSecurity";

const transaction = { LOCK: { UPDATE: "UPDATE" } };

jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(transaction)),
    query: jest.fn(),
  },
}));
jest.mock("@/lib/db/models/booking", () => ({ findAll: jest.fn() }));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfileversion", () => ({}));
jest.mock("@/lib/db/models/propertysharedailyview", () => ({
  findAll: jest.fn(),
}));
jest.mock("@/lib/db/models/propertysharefile", () => ({
  bulkCreate: jest.fn(),
  destroy: jest.fn(),
}));
jest.mock("@/lib/db/models/propertysharelink", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("@/lib/db/models/propertysharelisting", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("@/lib/db/models/propertyshareproperty", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
}));
jest.mock("@/lib/db/models/user", () => ({ findByPk: jest.fn() }));

function configuredListing(overrides = {}) {
  return {
    id: 90,
    ownerUserId: 7,
    bookingId: 20,
    listingTitle: "Corner home with full marina view",
    priceAed: "2350000.00",
    listingType: "FOR_SALE",
    bathrooms: 3,
    sizeSqft: 1244,
    furnishing: "FURNISHED",
    description: "Bright corner home near the marina.",
    highlights: ["Full marina view", "Upgraded kitchen"],
    contactName: "Synthetic Owner",
    contactPhone: "+971500000000",
    ...overrides,
  };
}

function eligibleBooking(overrides = {}) {
  const listing = configuredListing();
  return {
    id: 20,
    userId: 7,
    status: "COMPLETED",
    workflowStatus: "PROJECT_COMPLETED",
    completedAt: new Date("2026-07-20T10:00:00.000Z"),
    cancelledAt: null,
    propertyDetails: {
      unit: "1204",
      building: "Synthetic Tower",
      community: "Test District",
      propertySize: "2 Bed",
    },
    shootDetails: { services: ["Photography", "Videography"] },
    propertyShareListing: listing,
    deliveryFiles: [
      {
        id: 10,
        type: "Photography",
        label: "Final photography",
        status: "ACCEPTED",
        deletedAt: null,
        currentVersionId: 100,
        currentVersion: {
          id: 100,
          deliveryFileId: 10,
          supersededAt: null,
          originalFilename: "synthetic-property.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 2048,
        },
      },
    ],
    ...overrides,
  };
}

function publicProperty(booking = eligibleBooking()) {
  return {
    id: 30,
    shareLinkId: 4,
    bookingId: booking.id,
    position: 0,
    booking,
    files: [
      {
        id: 500,
        sharePropertyId: 30,
        deliveryFileId: 10,
        deliveryFileVersionId: 100,
        deliveryFile: {
          id: 10,
          bookingId: booking.id,
          type: "Photography",
          label: "Final photography",
          status: "ACCEPTED",
          deletedAt: null,
          currentVersionId: 100,
          currentVersion: { id: 100, supersededAt: null },
        },
        deliveryFileVersion: {
          id: 100,
          deliveryFileId: 10,
          supersededAt: null,
          originalFilename: "synthetic-property.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 2048,
          url: "https://storage.invalid/deliverables/bookings/20/private.jpg",
        },
      },
    ],
  };
}

function publicShare(token, overrides = {}) {
  const share = {
    id: 4,
    ownerUserId: 7,
    kind: "SINGLE_PROPERTY",
    singleBookingId: 20,
    tokenDigest: digestPropertyShareToken(token),
    enabled: true,
    revokedAt: null,
    totalViews: 0,
    lastViewedAt: null,
    update: jest.fn(async (values) => Object.assign(share, values)),
    setDataValue: jest.fn((key, value) => {
      share[key] = value;
    }),
    toJSON: jest.fn(() => ({ ...share })),
    ...overrides,
  };
  return share;
}

const listingInput = {
  listingTitle: "Corner home with full marina view",
  priceAed: "2350000",
  listingType: "FOR_SALE",
  bathrooms: 3,
  sizeSqft: 1244,
  furnishing: "FURNISHED",
  description: "Bright corner home near the marina.",
  highlights: ["Full marina view", "Upgraded kitchen"],
  contactName: "Synthetic Owner",
  contactPhone: "+971500000000",
};

describe("property sharing service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
    User.findByPk.mockResolvedValue({ id: 7 });
    PropertyShareDailyView.findAll.mockResolvedValue([]);
    PropertyShareListing.findAll.mockResolvedValue([configuredListing()]);
    PropertyShareProperty.findAll.mockResolvedValue([]);
  });

  it("creates or updates one owner-scoped listing after eligibility validation", async () => {
    const booking = eligibleBooking({ propertyShareListing: null });
    const record = configuredListing({
      update: jest.fn(async (values) => Object.assign(record, values)),
    });
    Booking.findAll.mockResolvedValue([booking]);
    PropertyShareListing.findOne.mockResolvedValue(record);

    const result = await savePropertyShareListing(7, 20, listingInput);

    expect(PropertyShareListing.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerUserId: 7, bookingId: 20 },
        lock: "UPDATE",
      }),
    );
    expect(record.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: "Synthetic Owner",
        contactPhone: "+971500000000",
        priceAed: "2350000.00",
      }),
      { transaction },
    );
    expect(result.listing.highlights).toEqual([
      "Full marina view",
      "Upgraded kitchen",
    ]);
  });

  it("creates an immutable single snapshot and persists only the token digest", async () => {
    const booking = eligibleBooking();
    Booking.findAll.mockResolvedValue([booking]);
    PropertyShareLink.findOne.mockResolvedValue(null);
    PropertyShareLink.create.mockResolvedValue({ id: 4 });
    PropertyShareProperty.create.mockResolvedValue({ id: 30, bookingId: 20 });

    const result = await createSinglePropertyShare(7, 20);

    expect(PropertyShareLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 7,
        tokenDigest: expect.stringMatching(/^[0-9a-f]{64}$/u),
      }),
      { transaction },
    );
    expect(PropertyShareLink.create.mock.calls[0][0].token).toBeUndefined();
    expect(PropertyShareFile.bulkCreate).toHaveBeenCalledWith(
      [
        {
          sharePropertyId: 30,
          deliveryFileId: 10,
          deliveryFileVersionId: 100,
        },
      ],
      { transaction },
    );
    expect(result.publicUrl).toMatch(
      /^https:\/\/example\.test\/share\/[A-Za-z0-9_-]{43}$/u,
    );
  });

  it("requires listing configuration and at least two properties for a master", async () => {
    await expect(createMasterPropertyShare(7, [20])).rejects.toBeInstanceOf(
      PropertyShareConflictError,
    );

    Booking.findAll.mockResolvedValue([eligibleBooking()]);
    PropertyShareListing.findAll.mockResolvedValue([]);
    await expect(createSinglePropertyShare(7, 20)).rejects.toBeInstanceOf(
      PropertyShareConflictError,
    );
  });

  it("rejects accepted archives and other non-browser media", async () => {
    const booking = eligibleBooking();
    booking.deliveryFiles[0].currentVersion = {
      ...booking.deliveryFiles[0].currentVersion,
      originalFilename: "private-delivery.zip",
      mimeType: "application/zip",
    };
    Booking.findAll.mockResolvedValue([booking]);

    await expect(createSinglePropertyShare(7, 20)).rejects.toBeInstanceOf(
      PropertyShareNotFoundError,
    );
    expect(PropertyShareFile.bulkCreate).not.toHaveBeenCalled();
  });

  it("classifies safe photo, video, and 360 media without accepting HTML", () => {
    expect(
      getInlinePropertyMediaDetails(
        { type: "Photography" },
        { mimeType: "image/jpeg", originalFilename: "home.jpg" },
      ),
    ).toEqual({ kind: "IMAGE", mimeType: "image/jpeg" });
    expect(
      getInlinePropertyMediaDetails(
        { type: "Videography" },
        { mimeType: "video/mp4", originalFilename: "walkthrough.mp4" },
      ),
    ).toEqual({ kind: "VIDEO", mimeType: "video/mp4" });
    expect(
      getInlinePropertyMediaDetails(
        { type: "360 Virtual Tour" },
        { mimeType: "image/webp", originalFilename: "tour.webp" },
      ),
    ).toEqual({ kind: "TOUR", mimeType: "image/webp" });
    expect(
      getInlinePropertyMediaDetails(
        { type: "Unsafe" },
        { mimeType: "text/html", originalFilename: "page.html" },
      ),
    ).toBeNull();
  });

  it("serializes a complete showcase without persisted private URLs", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token);
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([publicProperty()]);

    const landing = await resolvePublicPropertyShareLanding(
      token,
      new Date("2026-07-22T10:00:00.000Z"),
    );

    expect(landing.properties[0]).toEqual(
      expect.objectContaining({
        title: "Corner home with full marina view",
        displayPrice: "AED 2,350,000",
        bedrooms: 2,
        bathrooms: 3,
        sizeSqft: 1244,
        contact: {
          name: "Synthetic Owner",
          phone: "+971500000000",
          telephoneUrl: "tel:+971500000000",
          whatsappUrl: "https://wa.me/971500000000",
        },
        media: [
          {
            id: 500,
            kind: "IMAGE",
            label: "Final photography",
            mimeType: "image/jpeg",
          },
        ],
      }),
    );
    expect(JSON.stringify(landing)).not.toContain("storage.invalid");
    expect(JSON.stringify(landing)).not.toContain("private.jpg");
    expect(share.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastViewedAt: expect.any(Date) }),
      { transaction },
    );
    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT"),
      expect.objectContaining({ transaction }),
    );
  });

  it("validates requested master membership before counting", async () => {
    const token = createPropertyShareToken();
    const first = publicProperty();
    const secondBooking = eligibleBooking({
      id: 21,
      propertyShareListing: configuredListing({ id: 91, bookingId: 21 }),
    });
    const second = { ...publicProperty(secondBooking), id: 31, bookingId: 21 };
    const share = publicShare(token, {
      kind: "MASTER",
      singleBookingId: null,
    });
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([first, second]);

    await expect(
      resolvePublicPropertyShareLanding(token, new Date(), 99),
    ).resolves.toBeNull();
    expect(share.update).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("resolves only exact token/property/snapshot media without counting", async () => {
    const token = createPropertyShareToken();
    PropertyShareLink.findOne.mockResolvedValue(publicShare(token));
    PropertyShareProperty.findAll.mockResolvedValue([publicProperty()]);

    await expect(
      resolvePublicPropertyShareMedia({
        token,
        propertyId: 30,
        sharedFileId: 500,
      }),
    ).resolves.toEqual({
      storageUrl:
        "https://storage.invalid/deliverables/bookings/20/private.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
    });
    await expect(
      resolvePublicPropertyShareMedia({
        token,
        propertyId: 30,
        sharedFileId: 999,
      }),
    ).resolves.toBeNull();
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("fails closed for stale pinned membership", async () => {
    const token = createPropertyShareToken();
    const property = publicProperty();
    property.files[0].deliveryFile.currentVersionId = 101;
    PropertyShareLink.findOne.mockResolvedValue(publicShare(token));
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    await expect(resolvePublicPropertyShareLanding(token)).resolves.toBeNull();
  });

  it("disables immediately and rotates without resetting analytics", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token, { totalViews: 42 });
    PropertyShareLink.findOne.mockResolvedValue(share);

    await setPropertyShareEnabled(7, 4, false);
    expect(share.enabled).toBe(false);
    const previousDigest = share.tokenDigest;
    const rotated = await rotatePropertyShareToken(7, 4);
    expect(share.tokenDigest).not.toBe(previousDigest);
    expect(share.totalViews).toBe(42);
    expect(rotated.publicUrl).toMatch(/\/share\/[A-Za-z0-9_-]{43}$/u);
  });

  it("returns listing-ready dashboard DTOs with aggregate views and no contacts", async () => {
    const booking = eligibleBooking();
    const share = publicShare(createPropertyShareToken(), {
      properties: [publicProperty(booking)],
      totalViews: 5,
    });
    Booking.findAll.mockResolvedValue([booking]);
    PropertyShareLink.findAll.mockResolvedValue([share]);
    PropertyShareDailyView.findAll.mockResolvedValue([
      { viewDate: "2026-07-22", requestViews: 5 },
    ]);

    const dashboard = await getPropertySharingDashboard(
      7,
      new Date("2026-07-22T10:00:00.000Z"),
    );

    expect(dashboard.eligibleProperties[0].listing.contactName).toBe(
      "Synthetic Owner",
    );
    expect(dashboard.shares[0].analytics.totalRequestViews).toBe(5);
    expect(dashboard.shares[0]).not.toHaveProperty("contacts");
  });
});
