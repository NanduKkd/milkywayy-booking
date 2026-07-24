/** @jest-environment node */

const { DataTypes, QueryTypes, Sequelize } = require("sequelize");
const {
  createDisposablePostgresDatabase,
  TEST_ADMIN_OPT_IN_VALUE,
} = require("../../testing/disposablePostgres");
const migration = require("../20260722090000-create-property-sharing.js");
const snapshotMigration = require("../20260724190000-create-property-share-media-snapshots.js");

jest.setTimeout(30000);

const timestamps = {
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
  },
};

const describeWithPostgres =
  process.env.MW_TEST_POSTGRES_ADMIN_OPT_IN === TEST_ADMIN_OPT_IN_VALUE
    ? describe
    : describe.skip;

describeWithPostgres(
  "property sharing migration with real PostgreSQL contention",
  () => {
    let database;
    let sequelize;
    let queryInterface;
    let ownerUserId;
    let bookingId;
    let BookingLockProbe;
    let ListingLockProbe;

    beforeAll(async () => {
      database = await createDisposablePostgresDatabase({
        databaseLabel: "property_sharing",
        setup: async ({ queryInterface: setupQueryInterface }) => {
          await setupQueryInterface.createTable("users", {
            id: {
              type: DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            ...timestamps,
          });
          await setupQueryInterface.createTable("bookings", {
            id: {
              type: DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            user_id: {
              type: DataTypes.INTEGER,
              allowNull: false,
              references: { model: "users", key: "id" },
            },
            ...timestamps,
          });
          await setupQueryInterface.createTable("booking_delivery_files", {
            id: {
              type: DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            booking_id: {
              type: DataTypes.INTEGER,
              allowNull: false,
              references: { model: "bookings", key: "id" },
            },
            type: {
              type: DataTypes.STRING,
              allowNull: false,
              defaultValue: "Photography",
            },
            label: {
              type: DataTypes.STRING,
              allowNull: false,
              defaultValue: "Photography",
            },
            delivery_mode: {
              type: DataTypes.STRING,
              allowNull: false,
              defaultValue: "download",
            },
            status: {
              type: DataTypes.STRING,
              allowNull: false,
              defaultValue: "ACCEPTED",
            },
            current_version_id: {
              type: DataTypes.INTEGER,
              allowNull: true,
            },
            deleted_at: {
              type: DataTypes.DATE,
              allowNull: true,
            },
            ...timestamps,
          });
          await setupQueryInterface.createTable(
            "booking_delivery_file_versions",
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
              },
              delivery_file_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "booking_delivery_files", key: "id" },
              },
              mime_type: {
                type: DataTypes.STRING,
                allowNull: true,
              },
              original_filename: {
                type: DataTypes.STRING,
                allowNull: true,
              },
              url: {
                type: DataTypes.TEXT,
                allowNull: true,
              },
              superseded_at: {
                type: DataTypes.DATE,
                allowNull: true,
              },
              ...timestamps,
            },
          );
          await migration.up(setupQueryInterface, Sequelize);
          await snapshotMigration.up(setupQueryInterface, Sequelize);
        },
      });
      sequelize = database.sequelize;
      queryInterface = database.queryInterface;
      BookingLockProbe = sequelize.define(
        "BookingLockProbe",
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
          },
        },
        {
          tableName: "bookings",
          timestamps: false,
        },
      );
      ListingLockProbe = sequelize.define(
        "ListingLockProbe",
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
          },
          bookingId: {
            type: DataTypes.INTEGER,
            field: "booking_id",
          },
        },
        {
          tableName: "property_share_listings",
          timestamps: false,
        },
      );
      BookingLockProbe.hasOne(ListingLockProbe, {
        as: "propertyShareListing",
        foreignKey: "bookingId",
      });
      const [users] = await sequelize.query(
        `INSERT INTO users (created_at, updated_at)
       VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
        { type: QueryTypes.INSERT },
      );
      ownerUserId = Number(users[0].id);
      const [bookings] = await sequelize.query(
        `INSERT INTO bookings (user_id, created_at, updated_at)
       VALUES (:ownerUserId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
        { replacements: { ownerUserId }, type: QueryTypes.INSERT },
      );
      bookingId = Number(bookings[0].id);
    });

    afterAll(async () => {
      try {
        if (database) {
          await sequelize.query("TRUNCATE property_share_links CASCADE");
          await snapshotMigration.down(queryInterface);
          await migration.down(queryInterface);
        }
      } finally {
        await database?.close();
      }
    });

    beforeEach(async () => {
      await sequelize.query(
        "TRUNCATE property_share_links, property_share_listings RESTART IDENTITY CASCADE",
      );
    });

    async function insertShare({ kind, idCharacter, singleBookingId = null }) {
      return sequelize.query(
        `
        INSERT INTO property_share_links
          (owner_user_id, kind, single_booking_id, public_id,
           enabled, total_views, created_at, updated_at)
        VALUES
          (:ownerUserId, :kind, :singleBookingId, :publicId,
           TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `,
        {
          replacements: {
            ownerUserId,
            kind,
            singleBookingId,
            publicId: idCharacter.repeat(43),
          },
          type: QueryTypes.INSERT,
        },
      );
    }

    it("backfills only legacy media accepted by the runtime safety classifier", async () => {
      await snapshotMigration.down(queryInterface);
      const [shareRows] = await insertShare({
        kind: "SINGLE_PROPERTY",
        singleBookingId: bookingId,
        idCharacter: "g",
      });
      const shareLinkId = Number(shareRows[0].id);
      const [propertyRows] = await sequelize.query(
        `
          INSERT INTO property_share_properties
            (share_link_id, booking_id, position, created_at, updated_at)
          VALUES
            (:shareLinkId, :bookingId, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `,
        {
          replacements: { shareLinkId, bookingId },
          type: QueryTypes.INSERT,
        },
      );
      const sharePropertyId = Number(propertyRows[0].id);
      const [fileRows] = await sequelize.query(
        `
          INSERT INTO booking_delivery_files
            (booking_id, type, label, delivery_mode, status,
             created_at, updated_at)
          VALUES
            (:bookingId, 'Photography', 'Photography', 'download', 'ACCEPTED',
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (:bookingId, 'Photography', 'Photography', 'download', 'ACCEPTED',
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `,
        { replacements: { bookingId }, type: QueryTypes.INSERT },
      );
      const safeFileId = Number(fileRows[0].id);
      const unsafeFileId = Number(fileRows[1].id);
      const [versionRows] = await sequelize.query(
        `
          INSERT INTO booking_delivery_file_versions
            (delivery_file_id, mime_type, original_filename, url,
             created_at, updated_at)
          VALUES
            (:safeFileId, 'application/octet-stream', 'legacy-safe.JPG',
             'private://legacy-safe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (:unsafeFileId, 'image/svg+xml', 'unsafe.svg',
             'private://unsafe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, delivery_file_id
        `,
        {
          replacements: { safeFileId, unsafeFileId },
          type: QueryTypes.INSERT,
        },
      );
      const versionByFile = new Map(
        versionRows.map((row) => [
          Number(row.delivery_file_id),
          Number(row.id),
        ]),
      );
      await sequelize.query(
        `
          UPDATE booking_delivery_files
          SET current_version_id = CASE
            WHEN id = :safeFileId THEN :safeVersionId
            WHEN id = :unsafeFileId THEN :unsafeVersionId
          END
          WHERE id IN (:safeFileId, :unsafeFileId)
        `,
        {
          replacements: {
            safeFileId,
            safeVersionId: versionByFile.get(safeFileId),
            unsafeFileId,
            unsafeVersionId: versionByFile.get(unsafeFileId),
          },
        },
      );

      await snapshotMigration.up(queryInterface, Sequelize);

      const memberships = await sequelize.query(
        `
          SELECT delivery_file_id
          FROM property_share_media
          WHERE share_property_id = :sharePropertyId
        `,
        {
          replacements: { sharePropertyId },
          type: QueryTypes.SELECT,
        },
      );
      expect(memberships).toEqual([{ delivery_file_id: safeFileId }]);
    });

    it("allows exactly one stable single link for an owner and booking", async () => {
      const results = await Promise.allSettled([
        insertShare({
          kind: "SINGLE_PROPERTY",
          singleBookingId: bookingId,
          idCharacter: "a",
        }),
        insertShare({
          kind: "SINGLE_PROPERTY",
          singleBookingId: bookingId,
          idCharacter: "b",
        }),
      ]);

      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
    });

    it("locks booking rows without locking a nullable listing join", async () => {
      await expect(
        sequelize.transaction((transaction) =>
          BookingLockProbe.findAll({
            where: { id: bookingId },
            include: [
              {
                model: ListingLockProbe,
                as: "propertyShareListing",
                required: false,
              },
            ],
            transaction,
            lock: {
              level: transaction.LOCK.UPDATE,
              of: BookingLockProbe,
            },
          }),
        ),
      ).resolves.toHaveLength(1);
    });

    it("allows exactly one stable master link per owner", async () => {
      const results = await Promise.allSettled([
        insertShare({ kind: "MASTER", idCharacter: "c" }),
        insertShare({ kind: "MASTER", idCharacter: "d" }),
      ]);

      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
    });

    it("allows exactly one owner-scoped listing per booking", async () => {
      const insertListing = () =>
        sequelize.query(
          `
            INSERT INTO property_share_listings
              (owner_user_id, booking_id, listing_title, price_aed,
               listing_type, bathrooms, size_sqft, furnishing, description,
               highlights, contact_name, contact_phone, created_at, updated_at)
            VALUES
              (:ownerUserId, :bookingId, 'Synthetic listing', 2350000.00,
               'FOR_SALE', 3, 1244, 'FURNISHED', 'Synthetic description',
               '["Pool"]'::jsonb, 'Synthetic Owner', '+971500000000',
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          {
            replacements: { ownerUserId, bookingId },
            type: QueryTypes.INSERT,
          },
        );

      const results = await Promise.allSettled([
        insertListing(),
        insertListing(),
      ]);

      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
    });

    it("keeps concurrent total view increments lossless", async () => {
      const [rows] = await insertShare({
        kind: "SINGLE_PROPERTY",
        singleBookingId: bookingId,
        idCharacter: "e",
      });
      const shareLinkId = Number(rows[0].id);
      const now = new Date("2026-07-22T10:00:00.000Z");

      await Promise.all(
        Array.from({ length: 40 }, () =>
          sequelize.transaction(async (transaction) => {
            await sequelize.query(
              `UPDATE property_share_links
             SET total_views = total_views + 1,
                 updated_at = :now
             WHERE id = :shareLinkId`,
              { replacements: { shareLinkId, now }, transaction },
            );
          }),
        ),
      );

      const [link] = await sequelize.query(
        "SELECT total_views FROM property_share_links WHERE id = :shareLinkId",
        { replacements: { shareLinkId }, type: QueryTypes.SELECT },
      );
      expect(Number(link.total_views)).toBe(40);
    });

    it("pins one exact version for each file in a shared property snapshot", async () => {
      const [shareRows] = await insertShare({
        kind: "SINGLE_PROPERTY",
        singleBookingId: bookingId,
        idCharacter: "f",
      });
      const shareLinkId = Number(shareRows[0].id);
      const [propertyRows] = await sequelize.query(
        `
          INSERT INTO property_share_properties
            (share_link_id, booking_id, position, created_at, updated_at)
          VALUES
            (:shareLinkId, :bookingId, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `,
        {
          replacements: { shareLinkId, bookingId },
          type: QueryTypes.INSERT,
        },
      );
      const sharePropertyId = Number(propertyRows[0].id);
      const [fileRows] = await sequelize.query(
        `
          INSERT INTO booking_delivery_files
            (booking_id, created_at, updated_at)
          VALUES
            (:bookingId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `,
        { replacements: { bookingId }, type: QueryTypes.INSERT },
      );
      const deliveryFileId = Number(fileRows[0].id);
      const [versionRows] = await sequelize.query(
        `
          INSERT INTO booking_delivery_file_versions
            (delivery_file_id, created_at, updated_at)
          VALUES
            (:deliveryFileId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (:deliveryFileId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `,
        { replacements: { deliveryFileId }, type: QueryTypes.INSERT },
      );
      const insertMembership = (deliveryFileVersionId) =>
        sequelize.query(
          `
            INSERT INTO property_share_media
              (share_property_id, delivery_file_id, delivery_file_version_id,
               position, created_at, updated_at)
            VALUES
              (:sharePropertyId, :deliveryFileId, :deliveryFileVersionId,
               0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          {
            replacements: {
              sharePropertyId,
              deliveryFileId,
              deliveryFileVersionId,
            },
          },
        );

      await expect(
        insertMembership(Number(versionRows[0].id)),
      ).resolves.toBeDefined();
      await expect(
        insertMembership(Number(versionRows[1].id)),
      ).rejects.toBeDefined();
    });
  },
);
