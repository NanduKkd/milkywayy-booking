/** @type {import('sequelize-cli').Migration} */

const SHARE_KINDS = ["SINGLE_PROPERTY", "MASTER"];

const timestamps = (Sequelize) => ({
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
  },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "property_share_links",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          owner_user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          kind: {
            type: Sequelize.ENUM(...SHARE_KINDS),
            allowNull: false,
          },
          single_booking_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "bookings", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          public_id: {
            type: Sequelize.STRING(43),
            allowNull: false,
          },
          enabled: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          total_views: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 0,
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_links
          ADD CONSTRAINT property_share_links_kind_booking_check
          CHECK (
            (kind = 'SINGLE_PROPERTY' AND single_booking_id IS NOT NULL)
            OR (kind = 'MASTER' AND single_booking_id IS NULL)
          )
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_links
          ADD CONSTRAINT property_share_links_public_id_check
          CHECK (public_id ~ '^[A-Za-z0-9_-]{43}$')
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_links
          ADD CONSTRAINT property_share_links_total_views_check
          CHECK (total_views >= 0)
        `,
        { transaction },
      );
      await queryInterface.addIndex("property_share_links", ["public_id"], {
        name: "property_share_links_public_id_unique",
        unique: true,
        transaction,
      });
      await queryInterface.addIndex(
        "property_share_links",
        ["owner_user_id", "created_at"],
        { name: "property_share_links_owner_created_idx", transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX property_share_links_single_unique
          ON property_share_links (owner_user_id, single_booking_id)
          WHERE kind = 'SINGLE_PROPERTY'
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX property_share_links_master_unique
          ON property_share_links (owner_user_id)
          WHERE kind = 'MASTER'
        `,
        { transaction },
      );

      await queryInterface.createTable(
        "property_share_properties",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          share_link_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "property_share_links", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          booking_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "bookings", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          position: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_properties
          ADD CONSTRAINT property_share_properties_position_check
          CHECK (position >= 0)
        `,
        { transaction },
      );
      await queryInterface.addIndex(
        "property_share_properties",
        ["share_link_id", "booking_id"],
        {
          name: "property_share_properties_share_booking_unique",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex(
        "property_share_properties",
        ["booking_id"],
        { name: "property_share_properties_booking_idx", transaction },
      );

      await queryInterface.createTable(
        "property_share_listings",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          owner_user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          booking_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "bookings", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          listing_title: {
            type: Sequelize.STRING(160),
            allowNull: false,
          },
          price_aed: {
            type: Sequelize.DECIMAL(14, 2),
            allowNull: false,
          },
          listing_type: {
            type: Sequelize.STRING(32),
            allowNull: false,
          },
          bathrooms: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          size_sqft: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          furnishing: {
            type: Sequelize.STRING(32),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: "",
          },
          highlights: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          contact_name: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          contact_phone: {
            type: Sequelize.STRING(16),
            allowNull: false,
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_listings
          ADD CONSTRAINT property_share_listings_values_check
          CHECK (
            char_length(listing_title) BETWEEN 3 AND 160
            AND price_aed > 0 AND price_aed <= 9999999999.99
            AND listing_type IN ('FOR_SALE', 'FOR_RENT_YEARLY', 'HOLIDAY_HOME')
            AND (bathrooms IS NULL OR bathrooms BETWEEN 0 AND 20)
            AND (size_sqft IS NULL OR size_sqft BETWEEN 1 AND 1000000)
            AND furnishing IN ('FURNISHED', 'UNFURNISHED')
            AND char_length(description) <= 4000
            AND jsonb_typeof(highlights) = 'array'
            AND jsonb_array_length(highlights) <= 12
            AND char_length(contact_name) BETWEEN 2 AND 100
            AND contact_phone ~ '^\\+?[0-9]{7,15}$'
          )
        `,
        { transaction },
      );
      await queryInterface.addIndex(
        "property_share_listings",
        ["owner_user_id", "booking_id"],
        {
          name: "property_share_listings_owner_booking_unique",
          unique: true,
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("property_share_listings", {
        transaction,
      });
      await queryInterface.dropTable("property_share_properties", {
        transaction,
      });
      await queryInterface.dropTable("property_share_links", { transaction });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_property_share_links_kind"',
        { transaction },
      );
    });
  },
};
