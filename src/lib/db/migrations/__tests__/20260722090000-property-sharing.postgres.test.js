/** @jest-environment node */

const { DataTypes, QueryTypes, Sequelize } = require("sequelize");
const {
  createDisposablePostgresDatabase,
  TEST_ADMIN_OPT_IN_VALUE,
} = require("../../testing/disposablePostgres");
const migration = require("../20260722090000-create-property-sharing.js");

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
              ...timestamps,
            },
          );
          await migration.up(setupQueryInterface, Sequelize);
        },
      });
      sequelize = database.sequelize;
      queryInterface = database.queryInterface;
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
  },
);
