module.exports = (sequelize, DataTypes) => {
  const SubOperationMedia = sequelize.define(
    "SubOperationMedia",
    {
      so_media_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      style_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "styles",
          key: "style_id",
        },
      },
      operation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "main_operation",
          key: "operation_id",
        },
      },
      sub_operation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "sub_operation",
          key: "sub_operation_id",
        },
      },
      sub_operation_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [1, 255] },
      },
      media_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [0, 255] },
      },
    },
    { tableName: "suboperation_media", timestamps: true }
  );

  SubOperationMedia.associated = (models) => {
    SubOperationMedia.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
    });

    SubOperationMedia.belongsTo(models.Style, {
      foreignKey: "operation_id",
      as: "main_operation",
    });

    SubOperationMedia.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
    });
  };

  return SubOperationMedia;
};
