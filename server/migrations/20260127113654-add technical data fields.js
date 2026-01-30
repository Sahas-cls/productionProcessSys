"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sub_operation", "cuttable_width", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("sub_operation", "folder_type", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("sub_operation", "finish_width", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("sub_operation", "needle_gauge", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("sub_operation", "cuttable_width");
    await queryInterface.removeColumn("sub_operation", "folder_type");
    await queryInterface.removeColumn("sub_operation", "finish_width");
    await queryInterface.removeColumn("sub_operation", "needle_gauge");
  },
};
