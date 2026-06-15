"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("special_videos", {
      video_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        comment: "Primary key - unique identifier for each video",
      },
      video_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: "User-provided unique video name",
      },
      video_description: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: "Optional video description (max 500 characters)",
      },
      media_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: "Full B2 storage path for the video file",
      },
      b2_file_id: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: "Backblaze B2 file ID for deletion operations",
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: "File size in bytes (max 500MB)",
      },
      video_duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Video duration in seconds",
      },
      video_quality: {
        type: Sequelize.ENUM("low", "medium", "high"),
        allowNull: false,
        defaultValue: "medium",
        comment: "Video quality preset selected by user",
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "Original filename from user's device",
      },
      mime_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "video/mp4",
        comment: "MIME type of the video file",
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "User ID who uploaded the video (from auth middleware)",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Soft delete flag - false means deleted",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: "Creation timestamp",
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: "Last update timestamp",
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Soft delete timestamp (null means not deleted)",
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex("special_videos", ["video_name"], {
      unique: true,
      name: "unique_video_name",
    });

    await queryInterface.addIndex("special_videos", ["uploaded_by"], {
      name: "idx_uploaded_by",
    });

    await queryInterface.addIndex("special_videos", ["created_at"], {
      name: "idx_created_at",
    });

    await queryInterface.addIndex("special_videos", ["is_active"], {
      name: "idx_is_active",
    });

    await queryInterface.addIndex("special_videos", ["video_quality"], {
      name: "idx_video_quality",
    });

    // Composite index for common queries (get active videos for a user ordered by creation)
    await queryInterface.addIndex(
      "special_videos",
      ["uploaded_by", "is_active", "created_at"],
      {
        name: "idx_user_active_created",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex("special_videos", "unique_video_name");
    await queryInterface.removeIndex("special_videos", "idx_uploaded_by");
    await queryInterface.removeIndex("special_videos", "idx_created_at");
    await queryInterface.removeIndex("special_videos", "idx_is_active");
    await queryInterface.removeIndex("special_videos", "idx_video_quality");
    await queryInterface.removeIndex(
      "special_videos",
      "idx_user_active_created",
    );

    // Drop the table
    await queryInterface.dropTable("special_videos");
  },
};
