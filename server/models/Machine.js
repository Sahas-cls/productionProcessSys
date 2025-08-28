module.exports = (sequelize, DataTypes) => {
  const Machine = sequelize.define(
    "Machine",
    {
      machine_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      machine_no: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      machine_name: {
        type: DataTypes.STRING,
      },
      machine_type: {
        type: DataTypes.STRING,
      },
      machine_brand: {
        type: DataTypes.STRING,
      },
      machine_location: {
        type: DataTypes.STRING,
      },
      purchase_date: {
        type: DataTypes.DATE,
      },
      supplier: {
        type: DataTypes.STRING,
      },
      service_date: {
        type: DataTypes.DATE,
      },
      machine_status: {
        type: DataTypes.STRING,
      },
      breakdown_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "machine",
      timestamps: true,
    }
  );

  Machine.associate = (models) => {
    // M:N with SubOperation
    Machine.belongsToMany(models.SubOperation, {
      through: "SubOperationMachine",
      foreignKey: "machine_id",
      otherKey: "sub_operation_id",
      as: "sub_operations",
    });

    // 1:M with needle-related tables
    Machine.hasMany(models.NeedleType, {
      foreignKey: "machine_id",
      as: "needleTypes",
    });

    Machine.hasMany(models.NeedleTread, {
      foreignKey: "machine_id",
      as: "needleTreads",
    });

    Machine.hasMany(models.NeedleLooper, {
      foreignKey: "machine_id",
      as: "needleLoopers",
    });
  };

  return Machine;
};
