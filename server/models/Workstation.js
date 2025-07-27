module.exports = (sequelize, DataTypes) => {
  const Workstation = sequelize.define(
    "Workstation",
    {
      workstation_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      layout_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "layout",
          key: "layout_id",
        },
      },
    },
    {
      tableName: "workstation",
      timestamps: true,
    }
  );

  Workstation.associate = (models) => {
    Workstation.belongsTo(models.Layout, {
      foreignKey: "layout_id",
      as: "layout",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Workstation.belongsTo(models.w, {
    //   foreignKey: "sub_operation_id",
    //   as: "subOperation",
    //   onDelete: "CASCADE",
    //   onUpdate: "CASCADE",
    // });
  };

  return Workstation;
};
