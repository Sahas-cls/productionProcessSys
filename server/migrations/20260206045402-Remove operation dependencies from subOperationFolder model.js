'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  async up(queryInterface, Sequelize) {

    /* -----------------------------------
       Remove operation dependencies
       from suboperation_folder
    ----------------------------------- */

    await queryInterface.removeColumn(
      'suboperation_folder',
      'operation_id'
    );

    await queryInterface.removeColumn(
      'suboperation_folder',
      'sub_operation_id'
    );

    await queryInterface.removeColumn(
      'suboperation_folder',
      'sub_operation_name'
    );

  },

  async down(queryInterface, Sequelize) {

    /* -----------------------------------
       Restore columns if rollback
    ----------------------------------- */

    await queryInterface.addColumn(
      'suboperation_folder',
      'operation_id',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'main_operation',
          key: 'main_operation_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    );

    await queryInterface.addColumn(
      'suboperation_folder',
      'sub_operation_id',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sub_operation',
          key: 'sub_operation_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    );

    await queryInterface.addColumn(
      'suboperation_folder',
      'sub_operation_name',
      {
        type: Sequelize.STRING(255),
        allowNull: false
      }
    );

  }

};
