"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.changeColumn("sub_operation", "needle_count", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.changeColumn("sub_operation", "needle_count", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
