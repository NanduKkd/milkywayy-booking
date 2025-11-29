'use strict';

/** @type {import('sequelize-cli').Migration} **/
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('bookings', 'status', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'DRAFT',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('bookings', 'status');
    }
};
