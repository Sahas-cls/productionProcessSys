"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("attachment_media", "folder_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      reference: {
        model: "attachment_folders",
        key: "folder_id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("attachment_media", "attachment_media");
  },
};
