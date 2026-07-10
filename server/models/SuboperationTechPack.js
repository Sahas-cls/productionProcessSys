module.exports = (sequelize, DataTypes) => {
  const SubOperationTechPack = sequelize.define(
    "SubOperationTechPack",
    {
      so_tech_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      style_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "styles",
          key: "style_id",
        },
      },
      tech_pack_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: { len: [0, 255] },
      },
      // for backblaze
      b2_file_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      original_filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      file_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    { tableName: "suboperation_tech_pack", timestamps: true },
  );

  SubOperationTechPack.associate = (models) => {
    SubOperationTechPack.belongsTo(models.Style, {
      foreignKey: "style_id",
      as: "style",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return SubOperationTechPack;
};
