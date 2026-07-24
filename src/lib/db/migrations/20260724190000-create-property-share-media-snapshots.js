/** @type {import('sequelize-cli').Migration} */

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
        "property_share_media",
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
          ALTER TABLE property_share_media
          ADD CONSTRAINT property_share_media_position_check
          CHECK (position >= 0)
        `,
        { transaction },
      );
      await queryInterface.addIndex(
        "property_share_media",
        ["share_property_id", "delivery_file_id"],
        {
          name: "property_share_media_property_file_unique",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex(
        "property_share_media",
        ["share_property_id", "position"],
        {
          name: "property_share_media_property_position_unique",
          unique: true,
          transaction,
        },
      );
      await queryInterface.addIndex(
        "property_share_media",
        ["delivery_file_version_id"],
        {
          name: "property_share_media_version_idx",
          transaction,
        },
      );
      await queryInterface.sequelize.query(
        `
          WITH media_candidates AS (
            SELECT
              property.id AS share_property_id,
              file.id AS delivery_file_id,
              version.id AS delivery_file_version_id,
              file.delivery_mode,
              LOWER(
                COALESCE(file.type, '') || ' ' || COALESCE(file.label, '')
              ) AS type_label,
              LOWER(
                BTRIM(SPLIT_PART(COALESCE(version.mime_type, ''), ';', 1))
              ) AS declared_mime_type,
              LOWER(COALESCE(version.original_filename, '')) AS filename,
              BTRIM(COALESCE(version.url, '')) AS media_url
            FROM property_share_properties AS property
            JOIN booking_delivery_files AS file
              ON file.booking_id = property.booking_id
            JOIN booking_delivery_file_versions AS version
              ON version.id = file.current_version_id
             AND version.delivery_file_id = file.id
            WHERE file.deleted_at IS NULL
              AND file.status IN ('UNDER_REVIEW', 'ACCEPTED')
              AND version.superseded_at IS NULL
          ),
          eligible_media AS (
            SELECT
              share_property_id,
              delivery_file_id,
              delivery_file_version_id,
              CASE
                WHEN type_label ~ '(360|virtual[[:space:]]*tour|panorama)'
                  THEN 2
                WHEN declared_mime_type IN (
                  'video/mp4',
                  'video/quicktime',
                  'video/webm'
                )
                  OR (
                    declared_mime_type IN ('', 'application/octet-stream')
                    AND filename ~ '\\.(mov|mp4|webm)$'
                  )
                  THEN 1
                ELSE 0
              END AS kind_position
            FROM media_candidates
            WHERE (
              type_label ~ '(360|virtual[[:space:]]*tour|panorama)'
              AND delivery_mode = 'copy_link'
              AND declared_mime_type = 'text/uri-list'
              AND LENGTH(media_url) BETWEEN 1 AND 2048
              AND media_url ~* '^https://[^[:space:]/?#@]+(?:[/?#][^[:space:]]*)?$'
            ) OR (
              type_label !~ '(360|virtual[[:space:]]*tour|panorama)'
              AND (
                declared_mime_type IN (
                  'image/avif',
                  'image/gif',
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'video/mp4',
                  'video/quicktime',
                  'video/webm'
                )
                OR (
                  declared_mime_type IN ('', 'application/octet-stream')
                  AND filename ~ '\\.(avif|gif|jpe?g|mov|mp4|png|webm|webp)$'
                )
              )
            )
          ),
          ranked_media AS (
            SELECT
              share_property_id,
              delivery_file_id,
              delivery_file_version_id,
              ROW_NUMBER() OVER (
                PARTITION BY share_property_id
                ORDER BY kind_position ASC, delivery_file_id ASC
              ) - 1 AS position
            FROM eligible_media
          )
          INSERT INTO property_share_media
            (share_property_id, delivery_file_id, delivery_file_version_id,
             position, created_at, updated_at)
          SELECT
            share_property_id,
            delivery_file_id,
            delivery_file_version_id,
            position,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          FROM ranked_media
          ON CONFLICT (share_property_id, delivery_file_id) DO NOTHING
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("property_share_media", { transaction });
    });
  },
};
