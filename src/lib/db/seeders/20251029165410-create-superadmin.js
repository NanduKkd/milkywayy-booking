"use strict";

require("dotenv").config();
const bcrypt = require("bcrypt");
const { USER_ROLES } = require("../../config/app.config");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash(
      process.env.SUPERADMIN_PASSWORD,
      10,
    );

    await queryInterface.bulkInsert(
      "users",
      [
        {
          fullName: process.env.SUPERADMIN_FULL_NAME || "Super Admin",
          email: process.env.SUPERADMIN_EMAIL,
          phone: process.env.SUPERADMIN_PHONE,
          password: hashedPassword,
          role: USER_ROLES.SUPERADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      "users",
      {
        email: process.env.SUPERADMIN_EMAIL,
      },
      {},
    );
  },
};
