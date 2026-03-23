/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("transactions", "invoice_number", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE bookings
      SET booking_code = 'MWB-' || (id + 1000)::text
      WHERE booking_code IS NULL
         OR booking_code LIKE 'MWY-%'
         OR booking_code LIKE 'BK-%';
    `);

    await queryInterface.sequelize.query(`
      WITH numbered AS (
        SELECT
          id,
          'MW-' ||
          TO_CHAR(COALESCE(paid_at, created_at) AT TIME ZONE 'UTC', 'YYYY-MMDD') ||
          '-' ||
          LPAD(
            ROW_NUMBER() OVER (
              PARTITION BY DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'UTC')
              ORDER BY COALESCE(paid_at, created_at), id
            )::text,
            3,
            '0'
          ) AS invoice_number
        FROM transactions
        WHERE status = 'success'
      )
      UPDATE transactions AS transaction
      SET invoice_number = numbered.invoice_number
      FROM numbered
      WHERE transaction.id = numbered.id;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE bookings
      SET booking_code = 'MWY-' || LPAD(id::text, 6, '0')
      WHERE booking_code LIKE 'MWB-%';
    `);

    await queryInterface.removeColumn("transactions", "invoice_number");
  },
};
