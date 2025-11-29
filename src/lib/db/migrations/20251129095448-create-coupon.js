'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('coupons', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      per_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minimum_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      percent_discount: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      max_discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      activated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deactivated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('coupons');
  },
};