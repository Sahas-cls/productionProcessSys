module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "Department",
    {
      department_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      department_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [3, 255] },
      },
      factory_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "factories",
          key: "factory_id",
        },
      },
    },
    {
      tableName: "departments",
      timestamps: true,
    }
  );

  Department.associate = (models) => {
    // Belongs to a factory
    Department.belongsTo(models.Factory, {
      foreignKey: "factory_id",
      as: "factory",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Has many users
    Department.hasMany(models.User, {
      foreignKey: "user_department",
      as: "users",
    });
  };

  return Department;
};
