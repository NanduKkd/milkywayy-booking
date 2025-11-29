import "dotenv/config";
import { sequelize } from "../src/lib/db/db.js";

async function inspectSchema() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    const schema = {};

    for (const table of tables) {
      const columns = await queryInterface.describeTable(table);
      schema[table] = columns;
    }

    console.log(JSON.stringify(schema, null, 2));
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  } finally {
    await sequelize.close();
  }
}

inspectSchema();
