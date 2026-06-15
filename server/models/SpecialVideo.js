module.exports = (sequelize, DataTypes) => {
  const SpecialVideos = sequelize.define(
    "SpecialVideos",
    {
      video_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        comment: "Primary key - unique identifier for each video",
      },
      video_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          len: [1, 100],
          notEmpty: true,
        },
        comment: "User-provided unique video name",
      },
      video_description: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          len: [0, 500],
        },
        comment: "Optional video description (max 500 characters)",
      },
      media_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          len: [1, 500],
          // isUrl: true,
        },
        comment: "Full B2 storage path for the video file",
      },
      b2_file_id: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          len: [1, 200],
          notEmpty: true,
        },
        comment: "Backblaze B2 file ID for deletion operations",
      },
      file_size: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: {
          min: 1,
          max: 524288000, // 500MB in bytes
        },
        comment: "File size in bytes (max 500MB)",
      },
      video_duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 36000, // Max 10 hours in seconds
        },
        comment: "Video duration in seconds",
      },
      video_quality: {
        type: DataTypes.ENUM("low", "medium", "high"),
        allowNull: false,
        defaultValue: "medium",
        comment: "Video quality preset selected by user",
      },
      original_filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [1, 255],
        },
        comment: "Original filename from user's device",
      },
      mime_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "video/mp4",
        comment: "MIME type of the video file",
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        comment: "User ID who uploaded the video (from auth middleware)",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Soft delete flag - false means deleted",
      },
    },
    {
      tableName: "special_videos",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      indexes: [
        {
          unique: true,
          fields: ["video_name"],
          name: "unique_video_name",
        },
        {
          fields: ["uploaded_by"],
          name: "idx_uploaded_by",
        },
        {
          fields: ["created_at"],
          name: "idx_created_at",
        },
        {
          fields: ["is_active"],
          name: "idx_is_active",
        },
        {
          fields: ["video_quality"],
          name: "idx_video_quality",
        },
      ],
      paranoid: true,
    },
  );

  SpecialVideos.associate = (models) => {
    SpecialVideos.belongsTo(models.User, {
      foreignKey: "uploaded_by",
      as: "uploaded_user",
    });
  };

  return SpecialVideos;
};
