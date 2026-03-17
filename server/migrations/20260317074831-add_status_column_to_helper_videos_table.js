"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.addColumn("helper_videos", "status", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Pending",
    });
  },

  async down(queryInterface, Sequelize) {
    queryInterface.removeColumn("helper_videos", "status");
  },
};
