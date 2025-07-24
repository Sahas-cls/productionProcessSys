module.exports = (sequelize, DataTypes) => {
  const SubOperation = sequelize.define(
    "SubOperation",
    {
      sub_operation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      main_operation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sub_operation_name: {
        type: DataTypes.STRING,
        validate: { len: [0, 255] },
      },
      smv: {
        type: DataTypes.FLOAT,
      },
      remark: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: "sub_operation",
      timestamps: true,
    }
  );

  SubOperation.associate = (models) => {
    // M:N with Machine
    SubOperation.belongsToMany(models.Machine, {
      through: "SubOperationMachine",
      foreignKey: "sub_operation_id",
      otherKey: "machine_id",
      as: "machines",
    });

    // M:1 with MainOperation
    SubOperation.belongsTo(models.MainOperation, {
      foreignKey: "main_operation_id",
      as: "mainOperation",
    });

    // 1:M with other needle-related tables
    SubOperation.hasMany(models.NeedleType, {
      foreignKey: "sub_operation_id",
      as: "needle_types",
    });

    SubOperation.hasMany(models.NeedleTread, {
      foreignKey: "sub_operation_id",
      as: "needle_treads",
    });

    SubOperation.hasMany(models.NeedleLooper, {
      foreignKey: "sub_operation_id",
      as: "needle_loopers",
    });
  };

  return SubOperation;
};
