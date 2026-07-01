/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex("transactions", ["status", "paid_at"], {
        name: "transactions_status_paid_at_idx",
        transaction,
      });
      await queryInterface.addIndex(
        "transactions",
        ["status", "refunded_amount"],
        {
          name: "transactions_status_refunded_amount_idx",
          transaction,
        },
      );
      await queryInterface.addIndex("bookings", ["date"], {
        name: "bookings_date_idx",
        transaction,
      });
      await queryInterface.addIndex("bookings", ["completed_at"], {
        name: "bookings_completed_at_idx",
        transaction,
      });
      await queryInterface.addIndex("bookings", ["cancelled_at"], {
        name: "bookings_cancelled_at_idx",
        transaction,
      });
      await queryInterface.addIndex("bookings", ["transaction_id"], {
        name: "bookings_transaction_id_idx",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "bookings",
        "bookings_transaction_id_idx",
        {
          transaction,
        },
      );
      await queryInterface.removeIndex(
        "bookings",
        "bookings_cancelled_at_idx",
        {
          transaction,
        },
      );
      await queryInterface.removeIndex(
        "bookings",
        "bookings_completed_at_idx",
        {
          transaction,
        },
      );
      await queryInterface.removeIndex("bookings", "bookings_date_idx", {
        transaction,
      });
      await queryInterface.removeIndex(
        "transactions",
        "transactions_status_refunded_amount_idx",
        {
          transaction,
        },
      );
      await queryInterface.removeIndex(
        "transactions",
        "transactions_status_paid_at_idx",
        {
          transaction,
        },
      );
    });
  },
};
