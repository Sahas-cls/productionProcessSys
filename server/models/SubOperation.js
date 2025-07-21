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
    // Belongs to MainOperation (M:1)
    SubOperation.belongsTo(models.MainOperation, {
      foreignKey: "main_operation_id",
      as: "mainOperation",
    });

    // Has one Machine (1:1)
    SubOperation.hasOne(models.Machine, {
      foreignKey: "sub_operation_id",
      as: "machine",
    });
  };

  return SubOperation;
};
