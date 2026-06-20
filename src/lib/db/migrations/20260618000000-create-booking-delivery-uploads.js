/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("booking_delivery_uploads", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "bookings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      replacement_file_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "booking_delivery_files", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      s3_upload_id: { type: Sequelize.TEXT, allowNull: false },
      object_key: { type: Sequelize.TEXT, allowNull: false, unique: true },
      original_filename: { type: Sequelize.STRING, allowNull: false },
      mime_type: { type: Sequelize.STRING, allowNull: false },
      size_bytes: { type: Sequelize.BIGINT, allowNull: false },
      deliverable_type: { type: Sequelize.STRING, allowNull: false },
      delivery_mode: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "direct_download",
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "INITIATED",
      },
      created_by: { type: Sequelize.INTEGER, allowNull: false },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      result_json: { type: Sequelize.JSONB, allowNull: true },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("booking_delivery_uploads", [
      "booking_id",
      "status",
    ]);
    await queryInterface.addIndex("booking_delivery_uploads", [
      "created_by",
      "status",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("booking_delivery_uploads");
  },
};
