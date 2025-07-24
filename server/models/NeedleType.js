module.exports = (sequelize, DataTypes) => {
  const NeedleType = sequelize.define(
    "NeedleType",
    {
      needle_type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sub_operation_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "sub_operation",
          key: "sub_operation_id",
        },
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      machine_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "machine",
          key: "machine_id",
        },
      },
    },
    {
      tableName: "needle_type",
      timestamps: true,
    }
  );

  NeedleType.associate = (models) => {
    NeedleType.belongsTo(models.Machine, {
      foreignKey: "machine_id",
      as: "machine",
    });

    NeedleType.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
    });
  };

  return NeedleType;
};
