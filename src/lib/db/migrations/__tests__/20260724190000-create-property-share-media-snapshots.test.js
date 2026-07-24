/** @jest-environment node */

const { Sequelize } = require("sequelize");
const migration = require("../20260724190000-create-property-share-media-snapshots.js");

function createQueryInterface() {
  const transaction = { id: "snapshot-migration-transaction" };
  return {
    transaction,
    queryInterface: {
      sequelize: {
        transaction: jest.fn((callback) => callback(transaction)),
        query: jest.fn(),
      },
      createTable: jest.fn(),
      addIndex: jest.fn(),
      dropTable: jest.fn(),
    },
  };
}

describe("property share media snapshot migration", () => {
  it("pins exact property, delivery-file, and version membership", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.createTable).toHaveBeenCalledWith(
      "property_share_media",
      expect.objectContaining({
        share_property_id: expect.objectContaining({
          allowNull: false,
          references: {
            model: "property_share_properties",
            key: "id",
          },
        }),
        delivery_file_id: expect.objectContaining({
          allowNull: false,
          references: { model: "booking_delivery_files", key: "id" },
        }),
        delivery_file_version_id: expect.objectContaining({
          allowNull: false,
          references: {
            model: "booking_delivery_file_versions",
            key: "id",
          },
        }),
      }),
      { transaction },
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_share_media",
      ["share_property_id", "delivery_file_id"],
      expect.objectContaining({ unique: true, transaction }),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_share_media",
      ["share_property_id", "position"],
      expect.objectContaining({ unique: true, transaction }),
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO property_share_media"),
      { transaction },
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("file.status IN ('UNDER_REVIEW', 'ACCEPTED')"),
      { transaction },
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "declared_mime_type IN ('', 'application/octet-stream')",
      ),
      { transaction },
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "'image/avif',\n                  'image/gif',\n                  'image/jpeg'",
      ),
      { transaction },
    );
    expect(queryInterface.sequelize.query).not.toHaveBeenCalledWith(
      expect.stringContaining("version.mime_type LIKE 'image/%'"),
      expect.anything(),
    );
  });

  it("drops snapshot membership without changing listing or link tables", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.down(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith(
      "property_share_media",
      { transaction },
    );
    expect(queryInterface.dropTable).toHaveBeenCalledTimes(1);
  });
});
