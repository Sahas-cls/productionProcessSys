"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("style_media", "b2_file_id", {
      type: Sequelize.STRING,
      allowNull: true,
      validate: { len: [0, 100] },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("style_media", "b2_file_id");
  },
};
