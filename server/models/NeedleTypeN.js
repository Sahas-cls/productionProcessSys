module.exports = (sequelize, DataTypes) => {
  const NeedleTypeN = sequelize.define(
    "NeedleTypeN",
    {
      needle_type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      needle_category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 255],
        },
      },

      needle_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 255],
        },
      },
    },
    {
      tableName: "needle_type_n",
      timestamps: true,
      underscored: false,
    }
  );

  NeedleTypeN.associate = (models) => {
    NeedleTypeN.hasMany(models.SubOperation, {
      foreignKey: "needle_type_id",
      as: "sub_operations",
    });

     NeedleTypeN.hasMany(models.OpNeedles, {
      foreignKey: "needle_type_id",
      as: "needles",
      // onDelete: "CASCADE",
      // onUpdate: "CASCADE",
    });
  };

  return NeedleTypeN;
};
