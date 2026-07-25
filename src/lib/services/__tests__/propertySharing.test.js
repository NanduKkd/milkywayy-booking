/** @jest-environment node */

import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import PropertyShareLink from "@/lib/db/models/propertysharelink";
import PropertyShareListing from "@/lib/db/models/propertysharelisting";
import PropertyShareMedia from "@/lib/db/models/propertysharemedia";
import PropertyShareProperty from "@/lib/db/models/propertyshareproperty";
import User from "@/lib/db/models/user";
import {
  createMasterPropertyShare,
  createSinglePropertyShare,
  getInlinePropertyMediaDetails,
  getPropertySharingDashboard,
  PropertyShareConflictError,
  PropertyShareNotFoundError,
  refreshPropertyShareMedia,
  resolvePublicPropertyShareLanding,
  resolvePublicPropertyShareMedia,
  resolvePublicPropertyShareMetadata,
  resolvePublicPropertySharePreview,
  savePropertyShareListing,
  setPropertyShareEnabled,
} from "../propertySharing";
import { createPropertyShareId } from "../propertySharingSecurity";

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
jest.mock("@/lib/db/models/propertysharemedia", () => ({
  bulkCreate: jest.fn(),
  destroy: jest.fn(),
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
        bookingId: 20,
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
          url: "https://storage.invalid/deliverables/bookings/20/private.jpg",
        },
      },
    ],
    ...overrides,
  };
}

function tourDeliveryFile() {
  return {
    id: 11,
    bookingId: 20,
    type: "360 Virtual Tour",
    label: "360 Virtual Tour",
    deliveryMode: "copy_link",
    status: "ACCEPTED",
    deletedAt: null,
    currentVersionId: 101,
    currentVersion: {
      id: 101,
      deliveryFileId: 11,
      supersededAt: null,
      originalFilename: "360 Virtual Tour link",
      mimeType: "text/uri-list",
      sizeBytes: null,
      url: "https://my.matterport.com/show/?m=synthetic",
    },
  };
}

function videoDeliveryFile() {
  return {
    id: 12,
    bookingId: 20,
    type: "Videography",
    label: "Property video",
    status: "ACCEPTED",
    deletedAt: null,
    currentVersionId: 102,
    currentVersion: {
      id: 102,
      deliveryFileId: 12,
      supersededAt: null,
      originalFilename: "synthetic-property.mp4",
      mimeType: "video/mp4",
      sizeBytes: 4096,
      url: "https://storage.invalid/deliverables/bookings/20/private.mp4",
    },
  };
}

function publicProperty(booking = eligibleBooking()) {
  return {
    id: 30,
    shareLinkId: 4,
    bookingId: booking.id,
    position: 0,
    booking,
    files: booking.deliveryFiles.map((file) => ({
      id: file.id,
      sharePropertyId: 30,
      deliveryFileId: file.id,
      deliveryFileVersionId: file.currentVersionId,
      deliveryFile: file,
      deliveryFileVersion: file.currentVersion,
    })),
  };
}

function publicShare(publicId, overrides = {}) {
  const share = {
    id: 4,
    ownerUserId: 7,
    kind: "SINGLE_PROPERTY",
    singleBookingId: 20,
    publicId,
    enabled: true,
    totalViews: 0,
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

    expect(Booking.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction,
        lock: { level: "UPDATE", of: Booking },
      }),
    );
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

  it("creates one stable opaque URL with exact under-review and accepted media snapshots", async () => {
    const booking = eligibleBooking();
    booking.deliveryFiles[0].status = "UNDER_REVIEW";
    booking.deliveryFiles.push(videoDeliveryFile(), tourDeliveryFile());
    Booking.findAll.mockResolvedValue([booking]);
    PropertyShareLink.findOne.mockResolvedValue(null);
    PropertyShareLink.create.mockResolvedValue({ id: 4 });
    PropertyShareProperty.create.mockResolvedValue({ id: 30, bookingId: 20 });

    const result = await createSinglePropertyShare(7, 20);

    expect(PropertyShareLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 7,
        publicId: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/u),
      }),
      { transaction },
    );
    expect(PropertyShareProperty.create).toHaveBeenCalledWith(
      { shareLinkId: 4, bookingId: 20, position: 0 },
      { transaction },
    );
    expect(PropertyShareMedia.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          sharePropertyId: 30,
          deliveryFileId: 10,
          deliveryFileVersionId: 100,
          position: 0,
        }),
        expect.objectContaining({
          sharePropertyId: 30,
          deliveryFileId: 12,
          deliveryFileVersionId: 102,
          position: 1,
        }),
        expect.objectContaining({
          sharePropertyId: 30,
          deliveryFileId: 11,
          deliveryFileVersionId: 101,
          position: 2,
        }),
      ],
      { transaction },
    );
    expect(result.publicUrl).toMatch(
      /^https:\/\/example\.test\/share\/[A-Za-z0-9_-]{43}$/u,
    );
  });

  it("makes a confirmed incomplete booking eligible with safe under-review media", async () => {
    const booking = eligibleBooking({
      status: "CONFIRMED",
      workflowStatus: "FILES_UPLOADED",
      completedAt: null,
    });
    booking.deliveryFiles[0].status = "UNDER_REVIEW";
    Booking.findAll.mockResolvedValue([booking]);
    PropertyShareLink.findAll.mockResolvedValue([]);

    const dashboard = await getPropertySharingDashboard(7);

    expect(dashboard.eligibleProperties).toHaveLength(1);
    expect(dashboard.eligibleProperties[0]).toEqual(
      expect.objectContaining({ id: 20, mediaCount: 1 }),
    );
  });

  it.each([
    ["cross-owner", { userId: 8 }],
    ["cancelled", { cancelledAt: new Date(), status: "CANCELLED" }],
    ["draft", { status: "DRAFT" }],
  ])("does not enumerate %s bookings", async (_label, overrides) => {
    Booking.findAll.mockResolvedValue([eligibleBooking(overrides)]);
    PropertyShareLink.findAll.mockResolvedValue([]);

    const dashboard = await getPropertySharingDashboard(7);

    expect(dashboard.eligibleProperties).toEqual([]);
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
    expect(PropertyShareProperty.create).not.toHaveBeenCalled();
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
        { type: "Short Form Video" },
        { mimeType: "video/mp4", originalFilename: "reel.mp4" },
      ),
    ).toEqual({ kind: "VIDEO", mimeType: "video/mp4" });
    expect(
      getInlinePropertyMediaDetails(
        { type: "Long Form Video" },
        { mimeType: "video/webm", originalFilename: "walkthrough.webm" },
      ),
    ).toEqual({ kind: "VIDEO", mimeType: "video/webm" });
    expect(
      getInlinePropertyMediaDetails(
        { type: "360 Virtual Tour", deliveryMode: "copy_link" },
        {
          mimeType: "text/uri-list",
          originalFilename: "360 Virtual Tour link",
          url: "https://my.matterport.com/show/?m=synthetic",
        },
      ),
    ).toEqual({
      kind: "TOUR",
      mimeType: "text/uri-list",
      embedUrl: "https://my.matterport.com/show/?m=synthetic",
    });
    expect(
      getInlinePropertyMediaDetails(
        { type: "360 Virtual Tour", deliveryMode: "copy_link" },
        {
          mimeType: "text/uri-list",
          originalFilename: "360 Virtual Tour link",
          url: "http://example.com/insecure-tour",
        },
      ),
    ).toBeNull();
    expect(
      getInlinePropertyMediaDetails(
        { type: "Unsafe" },
        { mimeType: "text/html", originalFilename: "page.html" },
      ),
    ).toBeNull();
  });

  it("serializes a complete showcase without persisted private URLs", async () => {
    const publicId = createPropertyShareId();
    const share = publicShare(publicId);
    const property = publicProperty();
    property.booking.deliveryFiles.push(
      tourDeliveryFile(),
      videoDeliveryFile(),
    );
    property.files.push(
      {
        id: 12,
        deliveryFileId: 12,
        deliveryFileVersionId: 102,
        deliveryFile: property.booking.deliveryFiles[2],
        deliveryFileVersion: property.booking.deliveryFiles[2].currentVersion,
      },
      {
        id: 11,
        deliveryFileId: 11,
        deliveryFileVersionId: 101,
        deliveryFile: property.booking.deliveryFiles[1],
        deliveryFileVersion: property.booking.deliveryFiles[1].currentVersion,
      },
    );
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    const landing = await resolvePublicPropertyShareLanding(
      publicId,
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
            id: 10,
            kind: "IMAGE",
            label: "Final photography",
            mimeType: "image/jpeg",
          },
          {
            id: 12,
            kind: "VIDEO",
            label: "Property video",
            mimeType: "video/mp4",
          },
          {
            id: 11,
            kind: "TOUR",
            label: "360 Virtual Tour",
            mimeType: "text/uri-list",
            embedUrl: "https://my.matterport.com/show/?m=synthetic",
          },
        ],
      }),
    );
    expect(JSON.stringify(landing)).not.toContain("storage.invalid");
    expect(JSON.stringify(landing)).not.toContain("private.jpg");
    expect(share.update).toHaveBeenCalledWith(
      { totalViews: expect.anything() },
      { transaction },
    );
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("validates requested master membership before counting", async () => {
    const publicId = createPropertyShareId();
    const first = publicProperty();
    const secondBooking = eligibleBooking({
      id: 21,
      propertyShareListing: configuredListing({ id: 91, bookingId: 21 }),
    });
    const second = { ...publicProperty(secondBooking), id: 31, bookingId: 21 };
    const share = publicShare(publicId, {
      kind: "MASTER",
      singleBookingId: null,
    });
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([first, second]);

    await expect(
      resolvePublicPropertyShareLanding(publicId, new Date(), 99),
    ).resolves.toBeNull();
    expect(share.update).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("resolves public metadata without incrementing link views", async () => {
    const publicId = createPropertyShareId();
    const share = publicShare(publicId);
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([publicProperty()]);

    const metadata = await resolvePublicPropertyShareMetadata(publicId);

    expect(metadata.properties[0]).toEqual(
      expect.objectContaining({
        title: "Corner home with full marina view",
        description: "Bright corner home near the marina.",
      }),
    );
    expect(share.update).not.toHaveBeenCalled();
    expect(JSON.stringify(metadata)).not.toContain("storage.invalid");
  });

  it("resolves only exact link, property, and current accepted media", async () => {
    const publicId = createPropertyShareId();
    PropertyShareLink.findOne.mockResolvedValue(publicShare(publicId));
    PropertyShareProperty.findAll.mockResolvedValue([publicProperty()]);

    await expect(
      resolvePublicPropertyShareMedia({
        token: publicId,
        propertyId: 30,
        sharedFileId: 10,
      }),
    ).resolves.toEqual({
      storageUrl:
        "https://storage.invalid/deliverables/bookings/20/private.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
    });
    await expect(
      resolvePublicPropertyShareMedia({
        token: publicId,
        propertyId: 30,
        sharedFileId: 999,
      }),
    ).resolves.toBeNull();
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("resolves previews only for an exact current image snapshot without counting a view", async () => {
    const publicId = createPropertyShareId();
    const property = publicProperty();
    property.booking.deliveryFiles.push(videoDeliveryFile());
    property.files.push({
      id: 12,
      deliveryFileId: 12,
      deliveryFileVersionId: 102,
      deliveryFile: property.booking.deliveryFiles[1],
      deliveryFileVersion: property.booking.deliveryFiles[1].currentVersion,
    });
    const share = publicShare(publicId);
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    await expect(
      resolvePublicPropertySharePreview({
        token: publicId,
        propertyId: 30,
        sharedFileId: 10,
      }),
    ).resolves.toEqual({
      storageUrl:
        "https://storage.invalid/deliverables/bookings/20/private.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      bookingId: 20,
    });
    await expect(
      resolvePublicPropertySharePreview({
        token: publicId,
        propertyId: 30,
        sharedFileId: 12,
      }),
    ).resolves.toBeNull();
    expect(share.update).not.toHaveBeenCalled();
  });

  it("renders under-review snapshot media without exposing review state", async () => {
    const publicId = createPropertyShareId();
    const property = publicProperty();
    property.files[0].deliveryFile.status = "UNDER_REVIEW";
    PropertyShareLink.findOne.mockResolvedValue(publicShare(publicId));
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    const landing = await resolvePublicPropertyShareLanding(publicId);

    expect(landing.properties[0].media).toEqual([
      expect.objectContaining({ id: 10, kind: "IMAGE" }),
    ]);
    expect(JSON.stringify(landing)).not.toMatch(
      /UNDER_REVIEW|ACCEPTED|review status/u,
    );
  });

  it("keeps later uploads outside an existing exact snapshot", async () => {
    const publicId = createPropertyShareId();
    const property = publicProperty();
    property.booking.deliveryFiles.push(videoDeliveryFile());
    PropertyShareLink.findOne.mockResolvedValue(publicShare(publicId));
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    const landing = await resolvePublicPropertyShareLanding(publicId);

    expect(landing.properties[0].media).toHaveLength(1);
    expect(landing.properties[0].media[0]).toEqual(
      expect.objectContaining({ id: 10, kind: "IMAGE" }),
    );
  });

  it("never sends external 360 links through the owned-object media route", async () => {
    const publicId = createPropertyShareId();
    const property = publicProperty();
    property.booking.deliveryFiles.push(tourDeliveryFile());
    property.files.push({
      id: 11,
      deliveryFileId: 11,
      deliveryFileVersionId: 101,
      deliveryFile: property.booking.deliveryFiles[1],
      deliveryFileVersion: property.booking.deliveryFiles[1].currentVersion,
    });
    PropertyShareLink.findOne.mockResolvedValue(publicShare(publicId));
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    await expect(
      resolvePublicPropertyShareMedia({
        token: publicId,
        propertyId: 30,
        sharedFileId: 11,
      }),
    ).resolves.toBeNull();
  });

  it("fails closed when current accepted media is no longer eligible", async () => {
    const publicId = createPropertyShareId();
    const property = publicProperty();
    property.booking.deliveryFiles[0].currentVersionId = 101;
    property.files[0].deliveryFile.currentVersionId = 101;
    PropertyShareLink.findOne.mockResolvedValue(publicShare(publicId));
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    await expect(
      resolvePublicPropertyShareLanding(publicId),
    ).resolves.toBeNull();
  });

  it("fails closed after a snapshotted file becomes changes requested", async () => {
    const publicId = createPropertyShareId();
    const property = publicProperty();
    property.files[0].deliveryFile.status = "CHANGES_REQUESTED";
    PropertyShareLink.findOne.mockResolvedValue(publicShare(publicId));
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    await expect(
      resolvePublicPropertyShareMedia({
        token: publicId,
        propertyId: 30,
        sharedFileId: 10,
      }),
    ).resolves.toBeNull();
  });

  it("does not silently add a later upload until explicit media refresh", async () => {
    const booking = eligibleBooking();
    const property = {
      id: 30,
      bookingId: 20,
      position: 0,
    };
    const share = publicShare(createPropertyShareId());
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([property]);
    Booking.findAll.mockResolvedValue([
      {
        ...booking,
        deliveryFiles: [booking.deliveryFiles[0], videoDeliveryFile()],
      },
    ]);

    await refreshPropertyShareMedia(7, 4);

    expect(PropertyShareMedia.destroy).toHaveBeenCalledWith({
      where: { sharePropertyId: 30 },
      transaction,
    });
    expect(PropertyShareMedia.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          deliveryFileId: 10,
          deliveryFileVersionId: 100,
        }),
        expect.objectContaining({
          deliveryFileId: 12,
          deliveryFileVersionId: 102,
        }),
      ],
      { transaction },
    );
  });

  it("disables and re-enables the same stable public identifier", async () => {
    const publicId = createPropertyShareId();
    const share = publicShare(publicId, { totalViews: 42 });
    PropertyShareLink.findOne.mockResolvedValue(share);

    await setPropertyShareEnabled(7, 4, false);
    expect(share.enabled).toBe(false);
    await setPropertyShareEnabled(7, 4, true);
    expect(share.enabled).toBe(true);
    expect(share.publicId).toBe(publicId);
    expect(share.totalViews).toBe(42);
  });

  it("returns listing-ready dashboard DTOs with stable URLs and total views", async () => {
    const booking = eligibleBooking();
    const publicId = createPropertyShareId();
    const share = publicShare(publicId, {
      properties: [publicProperty(booking)],
      totalViews: 5,
    });
    Booking.findAll.mockResolvedValue([booking]);
    PropertyShareLink.findAll.mockResolvedValue([share]);

    const dashboard = await getPropertySharingDashboard(
      7,
      new Date("2026-07-22T10:00:00.000Z"),
    );

    expect(dashboard.eligibleProperties[0].listing.contactName).toBe(
      "Synthetic Owner",
    );
    expect(dashboard.shares[0].linkViews).toBe(5);
    expect(dashboard.shares[0].publicUrl).toBe(
      `https://example.test/share/${publicId}`,
    );
    expect(dashboard.shares[0]).not.toHaveProperty("analytics");
  });
});
