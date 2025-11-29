'use strict';

/** @type {import('sequelize-cli').Migration} **/
module.exports = {
      async up(queryInterface, Sequelize) {
            // Add columns to transactions
            await queryInterface.addColumn('transactions', 'metadata', {
                  type: Sequelize.JSONB,
                  allowNull: true,
            });
            await queryInterface.addColumn('transactions', 'invoice_url', {
                  type: Sequelize.STRING,
                  allowNull: true,
            });

            // Add columns to wallet_transactions
            await queryInterface.addColumn('wallet_transactions', 'status', {
                  type: Sequelize.ENUM('pending', 'active', 'expired', 'used'),
                  allowNull: false,
                  defaultValue: 'active',
            });
            await queryInterface.addColumn('wallet_transactions', 'transaction_id', {
                  type: Sequelize.INTEGER,
                  allowNull: true,
                  references: {
                        model: 'transactions',
                        key: 'id',
                  },
                  onUpdate: 'CASCADE',
                  onDelete: 'SET NULL',
            });
      },

      async down(queryInterface, Sequelize) {
            // Remove columns from wallet_transactions
            await queryInterface.removeColumn('wallet_transactions', 'transaction_id');
            await queryInterface.removeColumn('wallet_transactions', 'status');
            // Optional: Drop the enum type if needed
            // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_wallet_transactions_status";');

            // Remove columns from transactions
            await queryInterface.removeColumn('transactions', 'invoice_url');
            await queryInterface.removeColumn('transactions', 'metadata');
      }
};
