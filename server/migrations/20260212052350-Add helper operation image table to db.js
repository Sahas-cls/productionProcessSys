'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('helper_images', {
      helper_image_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      helper_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'helper',
          key: 'helper_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      style_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'styles',
          key: 'style_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      original_file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      b2_file_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      file_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('helper_images');
  },
};
