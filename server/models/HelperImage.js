module.exports = (sequelize, DataTypes) => {
  const HelperImage = sequelize.define(
    "HelperImage",
    {
      helper_image_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      helper_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "helper",
          key: "helper_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      style_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "styles",
          key: "style_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      original_file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      b2_file_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      file_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
    },
    { tableName: "helper_images", timestamps: true },
  );

  HelperImage.associate = (models) => {
    HelperImage.belongsTo(models.Helper, {
      foreignKey: "helper_id",
      as: "helper_operation",
    });

    HelperImage.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
    });

    HelperImage.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return HelperImage;
};
