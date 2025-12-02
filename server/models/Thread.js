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
        allowNull: false,  // Changed to false if it's required
        validate: { len: [1, 255] },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,  // Fixed: toDefaultValue → defaultValue
      },
    },
    { 
      tableName: "thread",  // Consistent lowercase table naming
      timestamps: true 
    }
  );

  Thread.associate = (models) => {
    Thread.hasMany(models.SubOperation, {
      foreignKey: "thread_id",
      as: "sub_operations",
    });
  };

  return Thread;
};