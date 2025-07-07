module.exports = (sequelize, DataTypes) => {
  const Season = sequelize.define(
    "Season",
    {
      season_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      season: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [3, 255] },
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "customers",
          key: "customer_id",
        },
      },
    },
    {
      tableName: "seasons",
      timestamps: true,
    }
  );

  Season.associate = (models) => {
    Season.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      as: "customer",
    });

    Season.hasMany(models.Style, {
      foreignKey: "season_id",
      as: "seasons",
    });
  };

  return Season;
};
