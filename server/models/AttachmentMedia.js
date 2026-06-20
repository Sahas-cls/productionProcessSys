// models/AttachmentMedia.js
module.exports = (sequelize, DataTypes) => {
  const AttachmentMedia = sequelize.define(
    "AttachmentMedia",
    {
      attachment_media_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        comment: "Primary key - unique identifier for each attachment",
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [1, 255],
          notEmpty: true,
        },
        comment: "Original filename from user's device",
      },
      media_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          len: [1, 500],
        },
        comment: "Full B2 storage path for the file",
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
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "MIME type of the file (image/jpeg, video/mp4, etc.)",
      },
      media_type: {
        type: DataTypes.ENUM("image", "video"),
        allowNull: false,
        comment: "Type of media - image or video",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,

        comment: "Description of the attachment",
      },
      style_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Optional style number reference",
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        comment: "User ID who uploaded the file (from auth middleware)",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Soft delete flag - false means deleted",
      },
    },
    {
      tableName: "attachment_media",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      indexes: [
        {
          fields: ["uploaded_by"],
          name: "idx_attachment_uploaded_by",
        },
        {
          fields: ["style_no"],
          name: "idx_attachment_style",
        },
        {
          fields: ["media_type"],
          name: "idx_attachment_media_type",
        },
        {
          fields: ["created_at"],
          name: "idx_attachment_created_at",
        },
        {
          fields: ["is_active"],
          name: "idx_attachment_is_active",
        },
      ],
      paranoid: true,
    },
  );

  AttachmentMedia.associate = (models) => {
    AttachmentMedia.belongsTo(models.User, {
      foreignKey: "uploaded_by",
      as: "uploaded_user",
    });
  };

  return AttachmentMedia;
};
