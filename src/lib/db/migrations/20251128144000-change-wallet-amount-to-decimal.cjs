'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('wallet_transactions', 'amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('wallet_transactions', 'amount', {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
    }
};
