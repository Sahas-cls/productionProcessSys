
module.exports = (sequelize, DataTypes) => {
  const NeedleTread = sequelize.define(
    "NeedleTread",
    {
      needle_tread_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
  };

  return NeedleTread;
};
