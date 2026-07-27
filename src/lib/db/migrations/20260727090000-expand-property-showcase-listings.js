/** @type {import('sequelize-cli').Migration} */

const PROPERTY_TYPES = [
  "APARTMENT",
  "PENTHOUSE",
  "VILLA",
  "TOWNHOUSE",
  "COMMERCIAL",
];

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
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_listings
          DROP CONSTRAINT property_share_listings_values_check
        `,
        { transaction },
      );
      await queryInterface.changeColumn(
        "property_share_listings",
        "bathrooms",
        {
          type: Sequelize.DECIMAL(3, 1),
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "property_share_listings",
        "property_type",
        {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "APARTMENT",
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "property_share_listings",
        "maid_room",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "property_share_listings",
        "built_up_area_sqft",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "property_share_listings",
        "plot_area_sqft",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
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
            AND property_type IN (${PROPERTY_TYPES.map((value) => `'${value}'`).join(", ")})
            AND (
              (property_type = 'COMMERCIAL' AND bathrooms IS NULL AND maid_room = FALSE)
              OR (
                property_type <> 'COMMERCIAL'
                AND (bathrooms IS NULL OR (
                  bathrooms BETWEEN 0 AND 20
                  AND bathrooms * 2 = FLOOR(bathrooms * 2)
                ))
              )
            )
            AND (size_sqft IS NULL OR size_sqft BETWEEN 1 AND 1000000)
            AND (
              built_up_area_sqft IS NULL
              OR built_up_area_sqft BETWEEN 1 AND 1000000
            )
            AND (
              plot_area_sqft IS NULL
              OR plot_area_sqft BETWEEN 1 AND 10000000
            )
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

      await queryInterface.createTable(
        "property_saved_contacts",
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
          name: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          normalized_phone: {
            type: Sequelize.STRING(16),
            allowNull: false,
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_saved_contacts
          ADD CONSTRAINT property_saved_contacts_values_check
          CHECK (
            char_length(name) BETWEEN 2 AND 100
            AND normalized_phone ~ '^\\+?[0-9]{7,15}$'
          )
        `,
        { transaction },
      );
      await queryInterface.addIndex(
        "property_saved_contacts",
        ["owner_user_id", "normalized_phone"],
        {
          name: "property_saved_contacts_owner_phone_unique",
          unique: true,
          transaction,
        },
      );

      await queryInterface.createTable(
        "property_media_preferences",
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
          delivery_file_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "booking_delivery_files", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          position: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          visible: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          is_cover: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_media_preferences
          ADD CONSTRAINT property_media_preferences_position_check
          CHECK (position >= 0)
        `,
        { transaction },
      );
      await queryInterface.addIndex(
        "property_media_preferences",
        ["owner_user_id", "booking_id", "delivery_file_id"],
        {
          name: "property_media_preferences_owner_booking_file_unique",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex(
        "property_media_preferences",
        ["owner_user_id", "booking_id", "position"],
        {
          name: "property_media_preferences_owner_booking_position_unique",
          unique: true,
          transaction,
        },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX property_media_preferences_cover_unique
          ON property_media_preferences (owner_user_id, booking_id)
          WHERE is_cover = TRUE
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("property_media_preferences", {
        transaction,
      });
      await queryInterface.dropTable("property_saved_contacts", {
        transaction,
      });
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_listings
          DROP CONSTRAINT property_share_listings_values_check
        `,
        { transaction },
      );
      await queryInterface.removeColumn(
        "property_share_listings",
        "plot_area_sqft",
        { transaction },
      );
      await queryInterface.removeColumn(
        "property_share_listings",
        "built_up_area_sqft",
        { transaction },
      );
      await queryInterface.removeColumn(
        "property_share_listings",
        "maid_room",
        { transaction },
      );
      await queryInterface.removeColumn(
        "property_share_listings",
        "property_type",
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_listings
          ALTER COLUMN bathrooms TYPE INTEGER
          USING ROUND(bathrooms)::INTEGER
        `,
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
    });
  },
};
