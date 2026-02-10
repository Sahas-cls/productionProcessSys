"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /* -----------------------------------
       Remove unwanted operation relations
       from suboperation_tech_pack
    ----------------------------------- */

    await queryInterface.removeColumn("suboperation_tech_pack", "operation_id");

    await queryInterface.removeColumn(
      "suboperation_tech_pack",
      "sub_operation_id",
    );

    await queryInterface.removeColumn(
      "suboperation_tech_pack",
      "sub_operation_name",
    );
  },

  async down(queryInterface, Sequelize) {
    /* -----------------------------------
       Restore removed columns (rollback)
    ----------------------------------- */

    await queryInterface.addColumn("suboperation_tech_pack", "operation_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "main_operation",
        key: "main_operation_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addColumn(
      "suboperation_tech_pack",
      "sub_operation_id",
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "sub_operation",
          key: "sub_operation_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    );

    await queryInterface.addColumn(
      "suboperation_tech_pack",
      "sub_operation_name",
      {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
    );
  },
};
