module.exports = (sequelize, DataTypes) => {
  const UserCategory = sequelize.define('UserCategory', {
    category_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'user_categories', 
    timestamps: false,
  });

  // Define associations
  UserCategory.associate = (models) => {
    UserCategory.hasMany(models.User, {
      foreignKey: 'user_category', 
      as: 'users',                 
    });
  };

  return UserCategory;
};
