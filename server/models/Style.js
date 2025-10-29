module.exports = (sequelize, DataTypes) => {
  const Style = sequelize.define(
    "Style",
    {
      style_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      factory_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "factories",
          key: "factory_id",
        },
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "customers",
          key: "customer_id",
        },
      },
      season_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "seasons",
          key: "season_id",
        },
      },
      po_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      style_no: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 255],
        },
      },
      style_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 255],
        },
      },
      style_description: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [0, 255],
        },
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "styles",
      timestamps: true,
    }
  );

  Style.associate = (models) => {
    Style.belongsTo(models.Factory, {
      foreignKey: "factory_id",
      as: "factory",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Style.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      as: "customer",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Style.belongsTo(models.Season, {
      foreignKey: "season_id",
      as: "season",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Style.hasMany(models.StyleMedia, {
      foreignKey: "style_id",
      as: "style_medias",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Style.hasMany(models.Helper, {
      foreignKey: "style_id",
      as: "helpers",
    });

    Style.hasMany(models.MainOperation, {
      foreignKey: "style_no",
      as: "operations",
    });
  };

  return Style;
};
