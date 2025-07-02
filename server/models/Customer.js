module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      customer_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      customer_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "customer_types",
          key: "customer_type_id",
        },
      },
      customer_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [3, 255] },
      },
    },
    {
      tableName: "customers",
      timestamps: true,
    }
  );

  Customer.associate = (models) => {
    Customer.belongsTo(models.CustomerType, {
      foreignKey: "customer_type_id",
      as: "type",
    });

    Customer.hasMany(models.Season, {
      foreignKey: "customer_id",
      as: "seasons",
    });
  };

  return Customer;
};
