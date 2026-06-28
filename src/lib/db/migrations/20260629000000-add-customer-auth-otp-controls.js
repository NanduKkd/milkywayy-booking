/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "otp_expires_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("users", "otp_attempt_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("users", "otp_resend_available_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.createTable("oauth_rate_limits", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      bucket_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      key_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      window_start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      request_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex(
      "oauth_rate_limits",
      ["bucket_type", "key_hash", "window_start"],
      {
        unique: true,
        name: "oauth_rate_limits_bucket_key_window_unique",
      },
    );

    await queryInterface.addIndex("oauth_rate_limits", ["expires_at"], {
      name: "oauth_rate_limits_expires_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "oauth_rate_limits",
      "oauth_rate_limits_bucket_key_window_unique",
    );
    await queryInterface.removeIndex(
      "oauth_rate_limits",
      "oauth_rate_limits_expires_at_idx",
    );
    await queryInterface.dropTable("oauth_rate_limits");

    await queryInterface.removeColumn("users", "otp_resend_available_at");
    await queryInterface.removeColumn("users", "otp_attempt_count");
    await queryInterface.removeColumn("users", "otp_expires_at");
  },
};
