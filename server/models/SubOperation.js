module.exports = (sequelize, DataTypes) => {
  const SubOperation = sequelize.define(
    "SubOperation",
    {
      sub_operation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      main_operation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "main_operation",
          key: "main_operation_id",
        },
      },
      thread_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "thread",
          key: "thread_id",
        },
      },
      sub_operation_number: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      sub_operation_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      smv: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      needle_count: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      machine_type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      spi: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      needle_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "needle_type_n",
          key: "needle_type_id",
        },
      },
      looper_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "thread",
          key: "thread_id",
        },
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
      },
    },
    {
      tableName: "sub_operation",
      timestamps: true,
      underscored: false,
    },
  );

  SubOperation.associate = (models) => {
    // Thread
    SubOperation.belongsTo(models.Thread, {
      foreignKey: "thread_id",
      as: "thread",
    });

    // Created by - user
    SubOperation.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    // Looper
    SubOperation.belongsTo(models.Thread, {
      foreignKey: "looper_id",
      as: "looper",
    });

    // Main Operation
    SubOperation.belongsTo(models.MainOperation, {
      foreignKey: "main_operation_id",
      as: "mainOperation",
    });

    // Needle Type
    SubOperation.belongsTo(models.NeedleTypeN, {
      foreignKey: "needle_type_id",
      as: "needle_type",
    });

    // Many-to-many machines
    SubOperation.belongsToMany(models.Machine, {
      through: "sub_operation_machine",
      foreignKey: "sub_operation_id",
      otherKey: "machine_id",
      as: "machines",
    });

    // Needle Thread
    SubOperation.hasMany(models.NeedleTread, {
      foreignKey: "sub_operation_id",
      as: "needle_treads",
    });

    // Needle Looper
    SubOperation.hasMany(models.NeedleLooper, {
      foreignKey: "sub_operation_id",
      as: "needle_loopers",
    });

    // Media
    SubOperation.hasMany(models.SubOperationMedia, {
      foreignKey: "sub_operation_id",
      as: "medias",
    });

    //needles
    SubOperation.hasMany(models.OpNeedles, {
      foreignKey: "sub_operation_id",
      as: "needles",
      // onDelete: "CASCADE",
      // onUpdate: "CASCADE",
    });
  };

  return SubOperation;
};
