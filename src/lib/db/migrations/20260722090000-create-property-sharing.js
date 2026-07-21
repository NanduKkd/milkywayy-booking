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
          token_digest: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          credential_version: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          enabled: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          revoked_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          total_views: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 0,
          },
          last_viewed_at: {
            type: Sequelize.DATE,
            allowNull: true,
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
          ADD CONSTRAINT property_share_links_token_digest_check
          CHECK (token_digest ~ '^[0-9a-f]{64}$')
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
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_links
          ADD CONSTRAINT property_share_links_credential_version_check
          CHECK (credential_version > 0)
        `,
        { transaction },
      );
      await queryInterface.addIndex("property_share_links", ["token_digest"], {
        name: "property_share_links_token_digest_unique",
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
          CREATE UNIQUE INDEX property_share_links_live_single_unique
          ON property_share_links (owner_user_id, single_booking_id)
          WHERE kind = 'SINGLE_PROPERTY' AND revoked_at IS NULL
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX property_share_links_live_master_unique
          ON property_share_links (owner_user_id)
          WHERE kind = 'MASTER' AND revoked_at IS NULL
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
        "property_share_files",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          share_property_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "property_share_properties", key: "id" },
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
          delivery_file_version_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "booking_delivery_file_versions",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.addIndex(
        "property_share_files",
        ["share_property_id", "delivery_file_id"],
        {
          name: "property_share_files_property_file_unique",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex(
        "property_share_files",
        ["delivery_file_version_id"],
        { name: "property_share_files_version_idx", transaction },
      );

      await queryInterface.createTable(
        "property_share_daily_views",
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
          view_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          request_views: {
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
          ALTER TABLE property_share_daily_views
          ADD CONSTRAINT property_share_daily_views_count_check
          CHECK (request_views >= 0)
        `,
        { transaction },
      );
      await queryInterface.addIndex(
        "property_share_daily_views",
        ["share_link_id", "view_date"],
        {
          name: "property_share_daily_views_share_date_unique",
          unique: true,
          transaction,
        },
      );

      await queryInterface.createTable(
        "property_share_contacts",
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
          share_property_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "property_share_properties", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          name: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          phone: {
            type: Sequelize.STRING(16),
            allowNull: false,
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE property_share_contacts
          ADD CONSTRAINT property_share_contacts_values_check
          CHECK (
            char_length(name) BETWEEN 2 AND 100
            AND phone ~ '^\\+?[0-9]{7,15}$'
            AND expires_at > created_at
          )
        `,
        { transaction },
      );
      await queryInterface.addIndex(
        "property_share_contacts",
        ["share_link_id", "expires_at", "created_at"],
        { name: "property_share_contacts_owner_read_idx", transaction },
      );
      await queryInterface.addIndex(
        "property_share_contacts",
        ["expires_at", "id"],
        { name: "property_share_contacts_expiry_cleanup_idx", transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("property_share_contacts", {
        transaction,
      });
      await queryInterface.dropTable("property_share_daily_views", {
        transaction,
      });
      await queryInterface.dropTable("property_share_files", { transaction });
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
