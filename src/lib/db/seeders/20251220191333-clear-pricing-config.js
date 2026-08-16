/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.bulkDelete("dynamic_configs", { key: "pricing" }, {});
  },

  async down(_queryInterface, _Sequelize) {},
};
