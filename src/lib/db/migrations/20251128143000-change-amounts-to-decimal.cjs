'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Transaction table
        await queryInterface.changeColumn('transactions', 'amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        });
        await queryInterface.changeColumn('transactions', 'refunded_amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('transactions', 'coupon_deduction', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('transactions', 'wallet_deduction', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('transactions', 'bulk_deduction', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });

        // Booking table
        await queryInterface.changeColumn('bookings', 'total', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        });
        await queryInterface.changeColumn('bookings', 'paid_amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('bookings', 'refunded_amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Revert back to INTEGER (might lose precision)
        await queryInterface.changeColumn('transactions', 'amount', {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
        await queryInterface.changeColumn('transactions', 'refunded_amount', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('transactions', 'coupon_deduction', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('transactions', 'wallet_deduction', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('transactions', 'bulk_deduction', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });

        await queryInterface.changeColumn('bookings', 'total', {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
        await queryInterface.changeColumn('bookings', 'paid_amount', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.changeColumn('bookings', 'refunded_amount', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
    }
};
