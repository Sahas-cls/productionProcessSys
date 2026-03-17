"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sub_operation", "needle_gauge", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sub_operation", "needle_gauge", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
