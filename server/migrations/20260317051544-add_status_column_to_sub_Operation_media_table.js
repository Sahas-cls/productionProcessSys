"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.addColumn("suboperation_media", "status", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Pending",
    });
  },

  async down(queryInterface, Sequelize) {
   queryInterface.removeColumn("suboperation_media", "status")
  },
};
