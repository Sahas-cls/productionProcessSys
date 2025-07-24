module.exports = (sequelize, DataTypes) => {
  const NeedleTread = sequelize.define(
    "NeedleTread",
    {
      needle_tread_id: {
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
      tread: {
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
      tableName: "needle_tread",
      timestamps: true,
    }
  );

  NeedleTread.associate = (models) => {
    NeedleTread.belongsTo(models.Machine, {
      foreignKey: "machine_id",
      targetKey: "machine_id",
      as: "machine",
    });

    NeedleTread.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
    });
  };

  return NeedleTread;
};
