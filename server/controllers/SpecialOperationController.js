const { SpecialVideos } = require("../models");
const b2SpecialVideoStorage = require("../utils/b2SpecialVideoStorage");
const path = require("path");

// Get all special videos for authenticated user
exports.getSpecialVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await SpecialVideos.findAndCountAll({
      where: {
        uploaded_by: req.user?.userId,
        is_active: true, // Only fetch active (not soft-deleted) videos
      },
      order: [["created_at", "DESC"]], // Using created_at instead of createdAt
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      success: true,
      data: {
        videos: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get special videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error: error.message,
    });
  }
};

// Upload special video
exports.uploadSpecialVideo = async (req, res) => {
  // Check if file exists
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No video file uploaded",
    });
  }

  // Extract form data
  const {
    videoName,
    videoDescription,
    recordingDuration,
    videoQuality,
    originalSize,
    compressedSize,
  } = req.body;

  // Validate required fields
  if (!videoName || videoName.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Video name is required",
    });
  }

  if (!recordingDuration) {
    return res.status(400).json({
      success: false,
      message: "Video duration is required",
    });
  }

  try {
    // STEP 1: Check for duplicate video name
    const existingVideo = await SpecialVideos.findOne({
      where: {
        video_name: videoName.trim(),
      },
    });

    if (existingVideo) {
      return res.status(409).json({
        success: false,
        message: "Video name already exists. Please choose a different name",
      });
    }

    // STEP 2: Prepare filename
    const finalFilename = req.file.generatedName || req.file.originalname;

    console.log(`📤 Starting special video upload:`, {
      videoName,
      originalName: req.file.originalname,
      generatedName: finalFilename,
      size: req.file.size,
      duration: recordingDuration,
      quality: videoQuality,
    });

    // STEP 3: Upload to B2
    const uploadResult = await b2SpecialVideoStorage.uploadSpecialVideo(
      req.file.buffer,
      finalFilename,
    );

    // Get clean MIME type
    const cleanMimeType = req.file.mimetype.split(";")[0];

    // STEP 4: Save to database with ALL fields
    const dbRecord = await SpecialVideos.create({
      video_name: videoName.trim(),
      video_description: videoDescription?.trim() || null,
      media_url: uploadResult.filePath,
      b2_file_id: uploadResult.fileId,
      file_size: req.file.size,
      video_duration: parseInt(recordingDuration),
      video_quality: videoQuality || "medium",
      original_filename: req.file.originalname,
      mime_type: cleanMimeType,
      uploaded_by: req.user?.userId,
      is_active: true,
    });

    // STEP 5: Return success response
    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        video_id: dbRecord.video_id,
        video_name: dbRecord.video_name,
        video_description: dbRecord.video_description,
        media_url: dbRecord.media_url,
        file_size: dbRecord.file_size,
        video_duration: dbRecord.video_duration,
        video_quality: dbRecord.video_quality,
        original_filename: dbRecord.original_filename,
        mime_type: dbRecord.mime_type,
        created_at: dbRecord.created_at,
        updated_at: dbRecord.updated_at,
      },
    });
  } catch (error) {
    console.error("❌ Special video upload error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload video",
      error: error.message,
    });
  }
};

// Delete special video (soft delete)
exports.deleteSpecialVideo = async (req, res) => {
  const { video_id } = req.params;

  if (!video_id) {
    return res.status(400).json({
      success: false,
      message: "Video ID is required",
    });
  }

  try {
    // STEP 1: Find the video record (only active ones)
    const videoRecord = await SpecialVideos.findOne({
      where: {
        video_id: video_id,
        is_active: true,
      },
    });

    if (!videoRecord) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // STEP 2: Check if user owns this video
    if (videoRecord.uploaded_by !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this video",
      });
    }

    // STEP 3: Delete from B2 storage
    if (videoRecord.b2_file_id && videoRecord.media_url) {
      try {
        await b2SpecialVideoStorage.deleteFile(
          videoRecord.b2_file_id,
          videoRecord.media_url,
        );
        console.log(`✅ Deleted from B2: ${videoRecord.media_url}`);
      } catch (b2Error) {
        console.error(
          "⚠️ B2 deletion failed but continuing with soft delete:",
          b2Error,
        );
        // Continue with soft delete even if B2 deletion fails
      }
    }

    // STEP 4: Soft delete from database (set is_active to false and deleted_at)
    await videoRecord.update({
      is_active: false,
      deleted_at: new Date(),
    });

    // STEP 5: Return success
    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      data: {
        video_id: parseInt(video_id),
        video_name: videoRecord.video_name,
      },
    });
  } catch (error) {
    console.error("❌ Delete special video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete video",
      error: error.message,
    });
  }
};

// Optional: Permanent delete (hard delete) - for admin use
exports.permanentDeleteSpecialVideo = async (req, res) => {
  const { video_id } = req.params;

  try {
    const videoRecord = await SpecialVideos.findByPk(video_id);

    if (!videoRecord) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check admin permission (optional - add admin check)
    // if (req.user?.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Admin access required",
    //   });
    // }

    // Delete from B2
    if (videoRecord.b2_file_id && videoRecord.media_url) {
      await b2SpecialVideoStorage.deleteFile(
        videoRecord.b2_file_id,
        videoRecord.media_url,
      );
    }

    // Permanently delete from database
    await videoRecord.destroy({ force: true });

    res.status(200).json({
      success: true,
      message: "Video permanently deleted",
    });
  } catch (error) {
    console.error("❌ Permanent delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete video",
      error: error.message,
    });
  }
};
