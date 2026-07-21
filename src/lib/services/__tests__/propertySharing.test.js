/** @jest-environment node */

import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import PropertyShareContact from "@/lib/db/models/propertysharecontact";
import PropertyShareDailyView from "@/lib/db/models/propertysharedailyview";
import PropertyShareFile from "@/lib/db/models/propertysharefile";
import PropertyShareLink from "@/lib/db/models/propertysharelink";
import PropertyShareProperty from "@/lib/db/models/propertyshareproperty";
import User from "@/lib/db/models/user";
import {
  createSinglePropertyShare,
  getPropertySharingDashboard,
  getPublicPropertyManifest,
  PropertyShareConflictError,
  PropertyShareNotFoundError,
  resolvePublicPropertyShareFile,
  resolvePublicPropertyShareLanding,
  rotatePropertyShareToken,
  setPropertyShareEnabled,
  submitPublicPropertyShareContact,
} from "../propertySharing";
import {
  createPropertyShareReceipt,
  createPropertyShareToken,
  digestPropertyShareToken,
  resetPropertyShareThrottleForTests,
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
jest.mock("@/lib/db/models/propertysharecontact", () => ({
  create: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
}));
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
jest.mock("@/lib/db/models/propertyshareproperty", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
}));
jest.mock("@/lib/db/models/user", () => ({ findByPk: jest.fn() }));

function eligibleBooking(overrides = {}) {
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
    },
    shootDetails: { services: ["Photography"] },
    deliveryFiles: [
      {
        id: 10,
        status: "ACCEPTED",
        deletedAt: null,
        currentVersionId: 100,
        currentVersion: {
          id: 100,
          supersededAt: null,
          originalFilename: "synthetic-property.zip",
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
          originalFilename: "synthetic-property.zip",
          url: "https://storage.invalid/private-object.zip",
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
    credentialVersion: 1,
    enabled: true,
    revokedAt: null,
    update: jest.fn(async (values) => Object.assign(share, values)),
    setDataValue: jest.fn((key, value) => {
      share[key] = value;
    }),
    toJSON: jest.fn(() => ({ ...share })),
    ...overrides,
  };
  return share;
}

describe("property sharing service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPropertyShareThrottleForTests();
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
    User.findByPk.mockResolvedValue({ id: 7 });
    PropertyShareContact.findAll.mockResolvedValue([]);
    PropertyShareDailyView.findAll.mockResolvedValue([]);
    PropertyShareProperty.findAll.mockResolvedValue([]);
  });

  it("creates one owner-scoped single snapshot and persists only the token digest", async () => {
    const booking = eligibleBooking();
    const share = { id: 4 };
    const property = { id: 30, bookingId: booking.id };
    Booking.findAll.mockResolvedValue([booking]);
    PropertyShareLink.findOne.mockResolvedValue(null);
    PropertyShareLink.create.mockResolvedValue(share);
    PropertyShareProperty.create.mockResolvedValue(property);

    const result = await createSinglePropertyShare(7, booking.id);

    expect(User.findByPk).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ lock: "UPDATE", transaction }),
    );
    expect(PropertyShareLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 7,
        kind: "SINGLE_PROPERTY",
        singleBookingId: 20,
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
    expect(result.publicUrl).not.toContain(
      PropertyShareLink.create.mock.calls[0][0].tokenDigest,
    );
  });

  it("fails closed when an owned booking is not currently eligible", async () => {
    Booking.findAll.mockResolvedValue([]);

    await expect(createSinglePropertyShare(7, 20)).rejects.toBeInstanceOf(
      PropertyShareNotFoundError,
    );
    expect(PropertyShareLink.create).not.toHaveBeenCalled();
  });

  it("requires at least two explicitly selected master properties", async () => {
    const { createMasterPropertyShare } = await import("../propertySharing");
    await expect(createMasterPropertyShare(7, [20])).rejects.toBeInstanceOf(
      PropertyShareConflictError,
    );
    expect(Booking.findAll).not.toHaveBeenCalled();
  });

  it("uses the same safe not-found result for missing and cross-owner mutations", async () => {
    PropertyShareLink.findOne.mockResolvedValue(null);

    await expect(setPropertyShareEnabled(99, 4, false)).rejects.toBeInstanceOf(
      PropertyShareNotFoundError,
    );
    expect(PropertyShareLink.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 4, ownerUserId: 99 } }),
    );
  });

  it("rotates the digest atomically without resetting aggregate history", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token, {
      totalViews: 42,
      lastViewedAt: new Date(),
    });
    PropertyShareLink.findOne.mockResolvedValue(share);

    const result = await rotatePropertyShareToken(7, 4);

    expect(share.update).toHaveBeenCalledWith(
      {
        tokenDigest: expect.stringMatching(/^[0-9a-f]{64}$/u),
        credentialVersion: 2,
      },
      { transaction },
    );
    expect(share.update.mock.calls[0][0].totalViews).toBeUndefined();
    expect(share.totalViews).toBe(42);
    expect(result.publicUrl).toMatch(/\/share\/[A-Za-z0-9_-]{43}$/u);
  });

  it("counts only a fully valid landing with atomic total and Dubai-day upsert", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token);
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([publicProperty()]);

    const result = await resolvePublicPropertyShareLanding(
      token,
      new Date("2026-07-22T21:30:00.000Z"),
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 4,
        kind: "SINGLE_PROPERTY",
        properties: [
          expect.objectContaining({ id: 30, title: expect.any(String) }),
        ],
      }),
    );
    expect(JSON.stringify(result)).not.toContain("private-object.zip");
    expect(JSON.stringify(result)).not.toContain("storage.invalid");
    expect(share.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastViewedAt: expect.any(Date) }),
      { transaction },
    );
    const [sql, queryOptions] = sequelize.query.mock.calls[0];
    expect(sql).toContain("ON CONFLICT (share_link_id, view_date)");
    expect(sql).toContain("request_views + 1");
    expect(queryOptions.replacements.viewDate).toBe("2026-07-23");
  });

  it("returns one generic invalid result without counting disabled links", async () => {
    const token = createPropertyShareToken();
    PropertyShareLink.findOne.mockResolvedValue(
      publicShare(token, { enabled: false }),
    );

    await expect(resolvePublicPropertyShareLanding(token)).resolves.toBeNull();
    await expect(
      resolvePublicPropertyShareLanding("malformed"),
    ).resolves.toBeNull();
    expect(PropertyShareProperty.findAll).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("fails a stale snapshotted member closed without counting it", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token);
    const property = publicProperty();
    property.files[0].deliveryFile.status = "CHANGES_REQUESTED";
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    await expect(resolvePublicPropertyShareLanding(token)).resolves.toBeNull();
    expect(share.update).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("does not count an invalid or unselected master property request", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token, {
      kind: "MASTER",
      singleBookingId: null,
    });
    const firstProperty = publicProperty();
    const secondProperty = publicProperty(eligibleBooking({ id: 21 }));
    secondProperty.id = 31;
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([
      firstProperty,
      secondProperty,
    ]);

    await expect(
      resolvePublicPropertyShareLanding(
        token,
        new Date("2026-07-22T10:00:00.000Z"),
        999,
      ),
    ).resolves.toBeNull();

    expect(share.update).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it("persists only normalized contact fields and issues a scoped receipt", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token);
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([publicProperty()]);

    const result = await submitPublicPropertyShareContact({
      token,
      propertyId: 30,
      input: { name: " Synthetic  Visitor ", phone: "00 971 50 123 4567" },
      networkAddress: "192.0.2.10",
      now: new Date("2026-07-22T10:00:00.000Z"),
    });

    expect(PropertyShareContact.create).toHaveBeenCalledWith(
      {
        shareLinkId: 4,
        sharePropertyId: 30,
        name: "Synthetic Visitor",
        phone: "+971501234567",
        expiresAt: new Date("2026-10-20T10:00:00.000Z"),
      },
      { transaction },
    );
    expect(result.receipt.cookieName).toBe("property-share-receipt-4-30");
  });

  it("reads eager-loaded properties from a Sequelize model data value", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token);
    let loadedProperties = [];
    share.setDataValue = jest.fn((key, value) => {
      if (key === "properties") loadedProperties = value;
    });
    share.toJSON = jest.fn(() => ({
      ...share,
      properties: loadedProperties,
    }));
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([publicProperty()]);

    const result = await submitPublicPropertyShareContact({
      token,
      propertyId: 30,
      input: { name: "Synthetic Visitor", phone: "+971501234567" },
      networkAddress: "192.0.2.11",
    });

    expect(result.receipt.cookieName).toBe("property-share-receipt-4-30");
    expect(PropertyShareContact.create).toHaveBeenCalledTimes(1);
    expect(share.properties).toBeUndefined();
  });

  it("reveals no manifest before a valid receipt and isolates selected files", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token);
    const property = publicProperty();
    PropertyShareLink.findOne.mockResolvedValue(share);
    PropertyShareProperty.findAll.mockResolvedValue([property]);

    await expect(
      getPublicPropertyManifest(token, 30, "invalid"),
    ).resolves.toBeNull();

    const receipt = await createPropertyShareReceipt({
      shareId: 4,
      propertyId: 30,
      credentialVersion: 1,
    });
    const manifest = await getPublicPropertyManifest(token, 30, receipt.token);
    expect(manifest.files).toEqual([
      expect.objectContaining({ id: 500, filename: "synthetic-property.zip" }),
    ]);
    expect(JSON.stringify(manifest)).not.toContain("storage.invalid");
    await expect(
      resolvePublicPropertyShareFile({
        token,
        propertyId: 30,
        sharedFileId: 999,
        receiptToken: receipt.token,
      }),
    ).resolves.toBeNull();
    await expect(
      resolvePublicPropertyShareFile({
        token,
        propertyId: 30,
        sharedFileId: 500,
        receiptToken: receipt.token,
      }),
    ).resolves.toEqual({
      url: "https://storage.invalid/private-object.zip",
      filename: "synthetic-property.zip",
    });
  });

  it("filters expired contacts immediately and bounds physical cleanup", async () => {
    const expired = Array.from({ length: 200 }, (_, index) => ({
      id: index + 1,
    }));
    PropertyShareContact.findAll.mockResolvedValue(expired);
    Booking.findAll.mockResolvedValue([]);
    PropertyShareLink.findAll.mockResolvedValue([]);
    PropertyShareContact.destroy.mockResolvedValue(200);
    const now = new Date("2026-07-22T10:00:00.000Z");

    const result = await getPropertySharingDashboard(7, now);

    expect(result).toEqual({ eligibleProperties: [], shares: [] });
    expect(PropertyShareContact.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: ["id"],
        limit: 200,
        where: expect.objectContaining({ expiresAt: expect.any(Object) }),
      }),
    );
    expect(PropertyShareContact.destroy).toHaveBeenCalledWith({
      where: { id: expect.any(Object) },
    });
  });

  it("joins owner-visible contacts through the current share membership", async () => {
    const token = createPropertyShareToken();
    const share = publicShare(token, { properties: [] });
    Booking.findAll.mockResolvedValue([]);
    PropertyShareLink.findAll.mockResolvedValue([share]);

    await getPropertySharingDashboard(7);

    expect(PropertyShareContact.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ shareLinkId: 4 }),
        include: [
          expect.objectContaining({
            as: "property",
            required: true,
            where: { shareLinkId: 4 },
          }),
        ],
      }),
    );
  });
});
