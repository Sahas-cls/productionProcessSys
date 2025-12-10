module.exports = (sequelize, DataTypes) => {
  const SubOperationLog = sequelize.define(
    "SubOperationLog",
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sub_operation_id: {
        type: DataTypes.INTEGER,
      },
      main_operation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      thread_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sub_operation_number: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      sub_operation_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      smv: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      needle_count: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      machine_type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      spi: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      needle_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      performed_action: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      looper_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "sub_operation_log",
      timestamps: true,
      underscored: false,
    }
  );

  return SubOperationLog;
};
