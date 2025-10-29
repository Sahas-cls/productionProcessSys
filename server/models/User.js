module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 255],
        },
      },
      user_email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      user_category: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "user_categories",
          key: "category_id",
        },
      },
      user_factory: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "factories",
          key: "factory_id",
        },
      },
      user_department: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "departments",
          key: "department_id",
        },
      },
      user_password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [5, 255],
        },
      },
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );

  User.associate = (models) => {
    // Belongs to a user category
    User.belongsTo(models.UserCategory, {
      foreignKey: "user_category",
      as: "category",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Works at a factory
    User.belongsTo(models.Factory, {
      foreignKey: "user_factory",
      as: "factory",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Belongs to a department
    User.belongsTo(models.Department, {
      foreignKey: "user_department",
      as: "department",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Has created factories
    // User.hasMany(models.Factory, {
    //   foreignKey: "created_by",
    //   as: "createdFactories",
    // });
  };

  return User;
};
