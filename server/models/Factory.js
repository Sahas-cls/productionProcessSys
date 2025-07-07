module.exports = (sequelize, DataTypes) => {
  const Factory = sequelize.define(
    "Factory",
    {
      factory_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      factory_code: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 255],
        },
      },
      factory_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 255],
        },
      },
    },
    {
      tableName: "factories",
      timestamps: false,
    }
  );

  Factory.associate = (models) => {
    // Factory is created by one User
    // Factory.belongsTo(models.User, {
    //   foreignKey: "created_by",
    //   as: "creator",
    // });

    // Factory has many Users (employees)
    Factory.hasMany(models.User, {
      foreignKey: "user_factory",
      as: "employees",
    });

    // Factory has many Departments
    Factory.hasMany(models.Department, {
      foreignKey: "factory_id",
      as: "departments",
    });

    Factory.hasMany(models.Style, {
      foreignKey: "factory_id",
      as: "styles",
    });
  };

  return Factory;
};
