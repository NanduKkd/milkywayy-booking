/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "accountType", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "INDIVIDUAL",
    });

    await queryInterface.addColumn("users", "companyName", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("users", "billingAddress", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("users", "trn", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "trn");
    await queryInterface.removeColumn("users", "billingAddress");
    await queryInterface.removeColumn("users", "companyName");
    await queryInterface.removeColumn("users", "accountType");
  },
};
