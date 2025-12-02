module.exports = (sequelize, DataTypes) => {
  const SubOperationFolder = sequelize.define(
    "SubOperationFolder",
    {
      so_folder_id: {
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
      folder_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [0, 255] },
      },
    },
    { tableName: "suboperation_folder", timestamps: true }
  );

  SubOperationFolder.associate = (models) => {
    SubOperationFolder.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
    });

    SubOperationFolder.belongsTo(models.MainOperation, {
      foreignKey: "operation_id",
      as: "main_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SubOperationFolder.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return SubOperationFolder;
};
