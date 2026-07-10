module.exports = (sequelize, DataTypes) => {
  const JigFolder = sequelize.define(
    "JigFolder",
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
    { tableName: "jig_folders", timestamps: true },
  );

  JigFolder.associate = (models) => {
    JigFolder.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "created",
    });

    JigFolder.hasMany(models.JigOperationMedia, {
      foreignKey: "folder_id",
      as: "media",
    });
  };

  return JigFolder;
};
