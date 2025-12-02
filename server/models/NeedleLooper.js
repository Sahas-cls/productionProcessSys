module.exports = (sequelize, DataTypes) => {
  const NeedleLooper = sequelize.define(
    "NeedleLooper",
    {
      needle_looper_id: {
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
      looper_type: {
        type: DataTypes.STRING, // e.g., "Rotary", "Oscillating"
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
      tableName: "needle_looper",
      timestamps: true,
    }
  );

  NeedleLooper.associate = (models) => {
    // Link to Machine (M:1)
    NeedleLooper.belongsTo(models.Machine, {
      foreignKey: "machine_id",
      as: "machine",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    NeedleLooper.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "sub_operation",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return NeedleLooper;
};
