module.exports = (sequelize, DataTypes) => {
  const CustomerType = sequelize.define(
    "CustomerType",
    {
      customer_type_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      customer_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [3, 255] },
      },
    },
    {
      tableName: "customer_types",
      timestamps: true,
    }
  );

  CustomerType.associate = (models) => {
    CustomerType.hasMany(models.Customer, {
      foreignKey: "customer_type_id",
      as: "customers",
    });
  };

  return CustomerType;
};
