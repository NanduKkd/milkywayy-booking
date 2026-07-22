/** @jest-environment node */

const { Sequelize } = require("sequelize");
const migration = require("../20260722090000-create-property-sharing.js");

function createQueryInterface() {
  const transaction = { id: "migration-transaction" };
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

describe("property sharing migration", () => {
  it("creates listing, link, snapshot, and aggregate tables without contact schema", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.createTable.mock.calls.map(([name]) => name)).toEqual(
      [
        "property_share_links",
        "property_share_properties",
        "property_share_files",
        "property_share_daily_views",
        "property_share_listings",
      ],
    );
    const links = queryInterface.createTable.mock.calls[0][1];
    expect(links).toEqual(
      expect.objectContaining({
        owner_user_id: expect.objectContaining({ allowNull: false }),
        token_digest: expect.objectContaining({ allowNull: false }),
        total_views: expect.objectContaining({ defaultValue: 0 }),
      }),
    );
    const listings = queryInterface.createTable.mock.calls[4][1];
    expect(Object.keys(listings)).toEqual(
      expect.arrayContaining([
        "owner_user_id",
        "booking_id",
        "listing_title",
        "price_aed",
        "listing_type",
        "bathrooms",
        "size_sqft",
        "furnishing",
        "description",
        "highlights",
        "contact_name",
        "contact_phone",
      ]),
    );
    expect(listings.share_link_id).toBeUndefined();
    expect(listings.expires_at).toBeUndefined();

    const sql = queryInterface.sequelize.query.mock.calls
      .map(([statement]) => statement)
      .join("\n");
    expect(sql).toContain("property_share_links_live_single_unique");
    expect(sql).toContain("property_share_links_live_master_unique");
    expect(sql).toContain("property_share_listings_values_check");
    expect(sql).not.toContain("property_share_contacts");
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_share_listings",
      ["owner_user_id", "booking_id"],
      expect.objectContaining({ unique: true, transaction }),
    );
  });

  it("rolls back child and listing tables before links and removes its enum", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.down(queryInterface);

    expect(queryInterface.dropTable.mock.calls.map(([name]) => name)).toEqual([
      "property_share_listings",
      "property_share_daily_views",
      "property_share_files",
      "property_share_properties",
      "property_share_links",
    ]);
    expect(queryInterface.sequelize.query).toHaveBeenLastCalledWith(
      'DROP TYPE IF EXISTS "enum_property_share_links_kind"',
      { transaction },
    );
  });
});
