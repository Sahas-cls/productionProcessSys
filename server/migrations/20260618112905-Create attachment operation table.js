"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("attachment_media", {
      attachment_media_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      media_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },

      b2_file_id: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },

      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },

      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      media_type: {
        type: Sequelize.ENUM("image", "video"),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      style_no: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },

      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("attachment_media", ["uploaded_by"], {
      name: "idx_attachment_uploaded_by",
    });

    await queryInterface.addIndex("attachment_media", ["style_no"], {
      name: "idx_attachment_style",
    });

    await queryInterface.addIndex("attachment_media", ["media_type"], {
      name: "idx_attachment_media_type",
    });

    await queryInterface.addIndex("attachment_media", ["created_at"], {
      name: "idx_attachment_created_at",
    });

    await queryInterface.addIndex("attachment_media", ["is_active"], {
      name: "idx_attachment_is_active",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("attachment_media");

    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_attachment_media_media_type;",
    );
  },
};
