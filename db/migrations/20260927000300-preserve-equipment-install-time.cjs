"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn(
            "equipment",
            "installed_at",
            { type: Sequelize.DATE, allowNull: false },
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn(
            "equipment",
            "installed_at",
            { type: Sequelize.DATEONLY, allowNull: false },
        );
    },
};
