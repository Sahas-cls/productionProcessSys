module.exports = (sequelize, DataTypes) => {
  const SubOperationImages = sequelize.define(
    "SubOperationImages",
    {
      so_img_id: {
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
        allowNull: true,
        validate: { len: [1, 255] },
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [0, 255] },
      },
    },
    { tableName: "suboperation_images", timestamps: true }
  );

  SubOperationImages.associate = (models) => {
    SubOperationImages.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
    });

    SubOperationImages.belongsTo(models.MainOperation, {
      foreignKey: "operation_id",
      as: "main_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SubOperationImages.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return SubOperationImages;
};
