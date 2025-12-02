module.exports = (sequelize, DataTypes) => {
  const StyleMedia = sequelize.define(
    "StyleMedia",
    {
      style_media_id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      style_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "styles",
          key: "style_id",
        },
      },
      media_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [0, 255] },
      },
      media_type: {
        type: DataTypes.ENUM("front", "back"),
        allowNull: false,
      },
    },
    {
      tableName: "style_media",
      timestamps: true,
    }
  );

  StyleMedia.associate = (models) => {
    StyleMedia.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return StyleMedia;
};
