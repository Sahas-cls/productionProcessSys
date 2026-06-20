"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("jig_operation_media", {
      jig_media_id: {
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
        allowNull: false,
      },

      operation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "sub_operation",
          key: "sub_operation_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      style_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "styles",
          key: "style_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
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

    await queryInterface.addIndex("jig_operation_media", ["operation_id"], {
      name: "idx_jig_operation",
    });

    await queryInterface.addIndex("jig_operation_media", ["style_id"], {
      name: "idx_jig_style",
    });

    await queryInterface.addIndex("jig_operation_media", ["uploaded_by"], {
      name: "idx_jig_uploaded_by",
    });

    await queryInterface.addIndex("jig_operation_media", ["media_type"], {
      name: "idx_jig_media_type",
    });

    await queryInterface.addIndex("jig_operation_media", ["created_at"], {
      name: "idx_jig_created_at",
    });

    await queryInterface.addIndex("jig_operation_media", ["is_active"], {
      name: "idx_jig_is_active",
    });

    await queryInterface.addIndex(
      "jig_operation_media",
      ["operation_id", "style_id"],
      {
        name: "idx_jig_operation_style",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("jig_operation_media");

    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_jig_operation_media_media_type;",
    );
  },
};
