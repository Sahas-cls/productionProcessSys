module.exports = (sequelize, DataTypes) => {
  const Helper = sequelize.define(
    "Helper",
    {
      helper_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      style_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "styles",
          key: "style_id",
        },
      },
      operation_type_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "operation_type",
          key: "operation_type_id",
        },
      },
      operation_code: {
        type: DataTypes.STRING,
        validate: { len: [0, 255] },
      },
      operation_name: {
        type: DataTypes.STRING,
        validate: { len: [0, 255] },
      },
      mc_type: {
        type: DataTypes.STRING,
        validate: { len: [0, 255] },
      },
      mc_smv: {
        type: DataTypes.STRING,
        validate: { len: [0, 255] },
      },
      comments: {
        type: DataTypes.STRING,
        validate: { len: [0, 255] },
      },
    },
    {
      tableName: "helper",
      timestamps: true,
    },
  );

  Helper.associate = (models) => {
    Helper.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Helper.belongsTo(models.OperationType, {
      foreignKey: "operation_type_id",
      as: "operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Helper.hasMany(models.HelperVideo, {
      foreignKey: "helper_id",
      as: "videos",
    });

    Helper.hasMany(models.HelperImage, {
      foreignKey: "helper_id",
      as: "images",
    });
  };

  return Helper;
};
