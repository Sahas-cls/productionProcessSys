module.exports = (sequelize, DataTypes) => {
  const MainOperation = sequelize.define(
    "MainOperation",
    {
      operation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      style_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      operation_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      operation_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "main_operation",
      timestamps: true,
    }
  );

  MainOperation.associate = (models) => {
    // 1 MainOperation has many SubOperations (1:M)
    MainOperation.hasMany(models.SubOperation, {
      foreignKey: "main_operation_id",
      as: "subOperations",
      onDelete: "CASCADE",
    });

    // Belongs to Style
    MainOperation.belongsTo(models.Style, {
      foreignKey: "style_no",
      as: "style",
    });

    // Belongs to OperationType
    MainOperation.belongsTo(models.OperationType, {
      foreignKey: "operation_type_id",
      as: "operationType",
    });
  };

  return MainOperation;
};
