module.exports = (sequelize, DataTypes) => {
  const AttachmentFolder = sequelize.define(
    "AttachmentFolder",
    {
      folder_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      folder_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
      },
    },
    { tableName: "attachment_folders", timestamps: true },
  );

  AttachmentFolder.associate = (models) => {
    AttachmentFolder.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "created",
    });

    AttachmentFolder.hasMany(models.AttachmentMedia, {
      foreignKey: "folder_id",
      as: "media",
    });
  };

  return AttachmentFolder;
};
