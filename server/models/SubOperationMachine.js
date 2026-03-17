module.exports = (sequelize, DataTypes) => {
  const SubOperationMachine = sequelize.define(
    "SubOperationMachine",
    {
      sub_operation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      machine_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
    },
    {
      tableName: "sub_operation_machine",
      timestamps: true, // You can enable if you want createdAt/updatedAt
    }
  );

  return SubOperationMachine;
};
