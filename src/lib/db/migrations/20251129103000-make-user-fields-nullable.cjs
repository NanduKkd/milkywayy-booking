'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('users', 'fullName', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.changeColumn('users', 'email', {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
        });
        await queryInterface.changeColumn('users', 'password', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('users', 'fullName', {
            type: Sequelize.STRING,
            allowNull: false,
        });
        await queryInterface.changeColumn('users', 'email', {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        });
        await queryInterface.changeColumn('users', 'password', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    }
};
