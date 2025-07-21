
module.exports = (sequelize, DataTypes) => {
  const Machine = sequelize.define("Machine", {
    machine_id: {
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
    machine_no: {
      type: DataTypes.STRING,
      allowNull: false,
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
    needle_count: {
      type: DataTypes.INTEGER,
    },
  }, {
    tableName:"machine",
    timestamps: true
  });

  Machine.associate = (models) => {
    // Link to SubOperation (assuming 1:1)
    Machine.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "subOperation",
    });

    // Link to Needle Tables (1:M)
    Machine.hasMany(models.NeedleType, {
      foreignKey: "machine_id",
      as: "needleTypes",
    });
    Machine.hasMany(models.NeedleTread, {
      foreignKey: "machine_id",
      as: "needleTreads",
    });
    Machine.hasMany(
      models.NeedleLooper,
      {
        foreignKey: "machine_id",
        as: "needleLoopers",
      },
      {
        tableName: "machine",
        timestamps: true,
      }
    );
  };

  return Machine;
};
