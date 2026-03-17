module.exports = (sequelize, DataTypes) => {
  const OpNeedles = sequelize.define(
    "OpNeedles",
    {
      op_needle_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sub_operation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "sub_operation",
          key: "sub_operation_id",
        },
      },
      needle_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "needle_type_n",
          key: "needle_type_id",
        },
      },
      thread_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "thread",
          key: "thread_id",
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    { tableName: "op_needles", timestamps: true },
  );

  OpNeedles.associate = (models) => {
    OpNeedles.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    OpNeedles.belongsTo(models.NeedleTypeN, {
      foreignKey: "needle_type_id",
      as: "needle_type",
    });

    OpNeedles.belongsTo(models.Thread, {
      foreignKey: "thread_id",
      as: "thread", // alias matches Thread.hasMany
    });
  };

  return OpNeedles;
};
