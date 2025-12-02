module.exports = (sequelize, DataTypes) => {
  const Layout = sequelize.define(
    "Layout",
    {
      layout_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      style_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "styles",
          key: "style_id",
        },
      },
      season_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "seasons",
          key: "season_id",
        },
      },
      workstation_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "layout",
      timestamps: true,
    }
  );

  Layout.associate = (models) => {
    Layout.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Layout.belongsTo(models.Season, {
      foreignKey: "season_id",
      as: "seasons",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Layout;
};
