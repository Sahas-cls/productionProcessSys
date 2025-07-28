module.exports = (sequelize, DataTypes) => {
  const WorkstationSubmenu = sequelize.define(
    "WorkstationSubmenu",
    {
      workstation_subm_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      workstation_id: {
        type: DataTypes.INTEGER,
        referecess: {
          model: "workstation",
          key: "workstation_id",
        },
      },
      sub_operation_id: {
        type: DataTypes.INTEGER,
        referecess: {
          model: "sub_operation",
          key: "sub_operation_id",
        },
      },
    },
    {
      tableName: "workstation_submenu",
      timestamps: true,
    }
  );

  WorkstationSubmenu.associate = (models) => {
    WorkstationSubmenu.belongsTo(models.Workstation, {
      foreignKey: "workstation_id",
      as: "workstation",
    });

    WorkstationSubmenu.belongsTo(models.SubOperation, {
      foreignKey: "sub_operation_id",
      as: "suboperatoin",
    });
  };

  return WorkstationSubmenu;
};
