module.exports = (sequelize, DataTypes) => {
  const Thread = sequelize.define(
    "Thread",
    {
      thread_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      thread_category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [1, 255] },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "thread",
      timestamps: true,
    },
  );

  Thread.associate = (models) => {
    // Threads used in SubOperations
    Thread.hasMany(models.SubOperation, {
      foreignKey: "thread_id",
      as: "sub_operations",
    });

    // Threads used in OpNeedles (bottom thread)
    Thread.hasMany(models.OpNeedles, {
      foreignKey: "thread_id",
      as: "thread", // alias matches OpNeedles.belongsTo
    });
  };

  return Thread;
};
