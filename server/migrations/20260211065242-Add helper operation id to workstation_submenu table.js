"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("workstation_submenu", "helper_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "helper",
        key: "helper_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // safer than CASCADE usually
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("workstation_submenu", "helper_id");
  },
};
