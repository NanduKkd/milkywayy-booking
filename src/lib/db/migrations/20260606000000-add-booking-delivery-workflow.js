/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bookings", "workflow_status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "SHOOT_BOOKED",
    });
    await queryInterface.addColumn("bookings", "shoot_completed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("bookings", "editing_started_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("bookings", "files_uploaded_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("bookings", "review_deadline_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("bookings", "revision_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(`
      UPDATE bookings
      SET workflow_status = CASE
        WHEN status = 'COMPLETED' OR completed_at IS NOT NULL
          THEN 'PROJECT_COMPLETED'
        ELSE 'SHOOT_BOOKED'
      END
    `);

    await queryInterface.createTable("booking_revisions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "bookings",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      revision_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      requested_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addConstraint("booking_revisions", {
      fields: ["booking_id", "revision_number"],
      type: "unique",
      name: "booking_revisions_booking_number_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("booking_revisions");
    await queryInterface.removeColumn("bookings", "revision_count");
    await queryInterface.removeColumn("bookings", "review_deadline_at");
    await queryInterface.removeColumn("bookings", "files_uploaded_at");
    await queryInterface.removeColumn("bookings", "editing_started_at");
    await queryInterface.removeColumn("bookings", "shoot_completed_at");
    await queryInterface.removeColumn("bookings", "workflow_status");
  },
};
