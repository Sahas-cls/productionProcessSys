// models/JigOperationMedia.js
module.exports = (sequelize, DataTypes) => {
  const JigOperationMedia = sequelize.define(
    "JigOperationMedia",
    {
      jig_media_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [1, 255],
          notEmpty: true,
        },
      },
      media_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          len: [1, 500],
        },
      },
      b2_file_id: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          len: [1, 200],
          notEmpty: true,
        },
      },
      file_size: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          min: 1,
          max: 524288000, // 500MB in bytes
        },
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      media_type: {
        type: DataTypes.ENUM("image", "video"),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          len: [10, 500],
          notEmpty: true,
        },
      },
      operation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "sub_operation",
          key: "sub_operation_id",
        },
      },
      style_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "styles",
          key: "style_id",
        },
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "jig_operation_media",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      indexes: [
        {
          fields: ["operation_id"],
          name: "idx_jig_operation",
        },
        {
          fields: ["style_id"],
          name: "idx_jig_style",
        },
        {
          fields: ["uploaded_by"],
          name: "idx_jig_uploaded_by",
        },
        {
          fields: ["media_type"],
          name: "idx_jig_media_type",
        },
        {
          fields: ["created_at"],
          name: "idx_jig_created_at",
        },
        {
          fields: ["is_active"],
          name: "idx_jig_is_active",
        },
        {
          fields: ["operation_id", "style_id"],
          name: "idx_jig_operation_style",
        },
      ],
      paranoid: true,
    },
  );

  JigOperationMedia.associate = (models) => {
    // Belongs to user who uploaded it
    JigOperationMedia.belongsTo(models.User, {
      foreignKey: "uploaded_by",
      as: "uploaded_user",
    });

    // Belongs to sub_operation (required)
    JigOperationMedia.belongsTo(models.SubOperation, {
      foreignKey: "operation_id",
      as: "operation",
    });

    // Belongs to style (required)
    JigOperationMedia.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
    });
  };

  return JigOperationMedia;
};
