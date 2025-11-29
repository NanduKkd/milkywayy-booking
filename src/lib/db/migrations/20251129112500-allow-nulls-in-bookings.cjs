'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('bookings', 'date', {
            type: Sequelize.DATEONLY,
            allowNull: true,
        });
        await queryInterface.changeColumn('bookings', 'slot', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
        await queryInterface.changeColumn('bookings', 'total', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('bookings', 'date', {
            type: Sequelize.DATEONLY,
            allowNull: false,
        });
        await queryInterface.changeColumn('bookings', 'slot', {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
        await queryInterface.changeColumn('bookings', 'total', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        });
    }
};
