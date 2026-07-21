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
  it("creates every table, constraint, and concurrency index in dependency order", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.createTable.mock.calls.map(([name]) => name)).toEqual(
      [
        "property_share_links",
        "property_share_properties",
        "property_share_files",
        "property_share_daily_views",
        "property_share_contacts",
      ],
    );
    const links = queryInterface.createTable.mock.calls[0][1];
    expect(links).toEqual(
      expect.objectContaining({
        owner_user_id: expect.objectContaining({ allowNull: false }),
        token_digest: expect.objectContaining({
          allowNull: false,
        }),
        credential_version: expect.objectContaining({ defaultValue: 1 }),
        total_views: expect.objectContaining({ defaultValue: 0 }),
      }),
    );
    const contacts = queryInterface.createTable.mock.calls[4][1];
    expect(Object.keys(contacts)).toEqual(
      expect.arrayContaining([
        "share_link_id",
        "share_property_id",
        "name",
        "phone",
        "expires_at",
      ]),
    );
    expect(contacts.email).toBeUndefined();
    expect(contacts.ip_address).toBeUndefined();
    expect(contacts.user_agent).toBeUndefined();

    const sql = queryInterface.sequelize.query.mock.calls
      .map(([statement]) => statement)
      .join("\n");
    expect(sql).toContain("property_share_links_live_single_unique");
    expect(sql).toContain("property_share_links_live_master_unique");
    expect(sql).toContain("property_share_links_token_digest_check");
    expect(sql).toContain("property_share_contacts_values_check");
    expect(sql).not.toContain("page_view_events");
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_share_daily_views",
      ["share_link_id", "view_date"],
      expect.objectContaining({ unique: true, transaction }),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "property_share_contacts",
      ["expires_at", "id"],
      expect.objectContaining({ transaction }),
    );
  });

  it("rolls back child tables before parents and removes its enum", async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.down(queryInterface);

    expect(queryInterface.dropTable.mock.calls.map(([name]) => name)).toEqual([
      "property_share_contacts",
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
