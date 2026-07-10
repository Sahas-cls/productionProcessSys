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
        allowNull: true,
      },
      folder_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "jig_folders",
          key: "folder_id",
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
      paranoid: true,
    },
  );

  JigOperationMedia.associate = (models) => {
    // Belongs to user who uploaded it
    JigOperationMedia.belongsTo(models.User, {
      foreignKey: "uploaded_by",
      as: "uploaded_user",
    });

    // test
    JigOperationMedia.belongsTo(models.JigFolder, {
      foreignKey: "folder_id",
      as: "folder",
    });
  };

  return JigOperationMedia;
};
