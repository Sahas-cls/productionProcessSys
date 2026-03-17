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
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
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
      onUpdate: "CASCADE",
    });

    // created by - user
    MainOperation.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    // Belongs to Style
    MainOperation.belongsTo(models.Style, {
      foreignKey: "style_no",
      as: "style",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Belongs to OperationType
    MainOperation.belongsTo(models.OperationType, {
      foreignKey: "operation_type_id",
      as: "operationType",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return MainOperation;
};
