"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("thread", "description", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn("thread", "status", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("thread", "description");
    await queryInterface.removeColumn("thread", "status");
  },
};
