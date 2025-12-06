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
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: { len: [0, 255] },
      },
      // for backblaze
      b2_file_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      original_filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      file_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    { tableName: "suboperation_media", timestamps: true }
  );

  SubOperationMedia.associate = (models) => {
    SubOperationMedia.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
    });

    SubOperationMedia.belongsTo(models.MainOperation, {
      foreignKey: "operation_id",
      as: "main_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SubOperationMedia.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return SubOperationMedia;
};
