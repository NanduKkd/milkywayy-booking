/** @jest-environment node */

const { Sequelize } = require("sequelize");
const migration = require("../20260727090000-expand-property-showcase-listings.js");

function createQueryInterface() {
  const transaction = { id: "migration-transaction" };
  return {
    transaction,
    queryInterface: {
      sequelize: {
        transaction: jest.fn((callback) => callback(transaction)),
        query: jest.fn(),
      },
      addColumn: jest.fn(),
      changeColumn: jest.fn(),
      addIndex: jest.fn(),
      createTable: jest.fn(),
      dropTable: jest.fn(),
      removeColumn: jest.fn(),
    },
  };
}

describe("expand property showcase listings migration", () => {
  it("adds richer listing details plus owner-scoped contacts and media preferences", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      "property_share_listings",
      "bathrooms",
      expect.objectContaining({
        type: expect.objectContaining({ options: { precision: 3, scale: 1 } }),
        allowNull: true,
      }),
      { transaction },
    );
    expect(
      queryInterface.addColumn.mock.calls.map(([_, name]) => name),
    ).toEqual([
      "property_type",
      "maid_room",
      "built_up_area_sqft",
      "plot_area_sqft",
    ]);
    expect(queryInterface.createTable.mock.calls.map(([name]) => name)).toEqual(
      ["property_saved_contacts", "property_media_preferences"],
    );

    const contacts = queryInterface.createTable.mock.calls[0][1];
    expect(contacts).toEqual(
      expect.objectContaining({
        owner_user_id: expect.objectContaining({ allowNull: false }),
        normalized_phone: expect.objectContaining({ allowNull: false }),
      }),
    );
    const preferences = queryInterface.createTable.mock.calls[1][1];
    expect(preferences).toEqual(
      expect.objectContaining({
        owner_user_id: expect.objectContaining({ allowNull: false }),
        booking_id: expect.objectContaining({ allowNull: false }),
        delivery_file_id: expect.objectContaining({ allowNull: false }),
        position: expect.objectContaining({ allowNull: false }),
        visible: expect.objectContaining({ defaultValue: true }),
        is_cover: expect.objectContaining({ defaultValue: false }),
      }),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_saved_contacts",
      ["owner_user_id", "normalized_phone"],
      expect.objectContaining({ unique: true, transaction }),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_media_preferences",
      ["owner_user_id", "booking_id", "delivery_file_id"],
      expect.objectContaining({ unique: true, transaction }),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_media_preferences",
      ["owner_user_id", "booking_id", "position"],
      expect.objectContaining({ unique: true, transaction }),
    );

    const sql = queryInterface.sequelize.query.mock.calls
      .map(([statement]) => statement)
      .join("\n");
    expect(sql).toContain("property_share_listings_values_check");
    expect(sql).toContain("bathrooms * 2 = FLOOR(bathrooms * 2)");
    expect(sql).toContain("property_type = 'COMMERCIAL'");
    expect(sql).toContain("property_media_preferences_cover_unique");
  });

  it("rolls back preference and contact tables before reverting listing columns", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.down(queryInterface, Sequelize);

    expect(queryInterface.dropTable.mock.calls.map(([name]) => name)).toEqual([
      "property_media_preferences",
      "property_saved_contacts",
    ]);
    expect(
      queryInterface.removeColumn.mock.calls.map(([_, name]) => name),
    ).toEqual([
      "plot_area_sqft",
      "built_up_area_sqft",
      "maid_room",
      "property_type",
    ]);
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("ALTER COLUMN bathrooms TYPE INTEGER"),
      { transaction },
    );
    expect(queryInterface.sequelize.query).toHaveBeenLastCalledWith(
      expect.stringContaining("property_share_listings_values_check"),
      { transaction },
    );
  });
});
