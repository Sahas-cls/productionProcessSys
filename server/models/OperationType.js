module.exports = (sequelize, DataTypes) => {
  const OperationType = sequelize.define(
    "OperationType",
    {
      operation_type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "operation_type",
      timestamps: true,
    }
  );

  OperationType.associate = (models) => {
    OperationType.hasMany(models.Helper, {
      foreignKey: "operation_type_id",
      as: "helpers",
    });

    OperationType.hasMany(models.MainOperation, {
      foreignKey: "operation_type_id",
      as: "mainOperations",
    });
  };

  return OperationType;
};
