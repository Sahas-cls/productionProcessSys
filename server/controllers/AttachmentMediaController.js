// controllers/attachmentMediaController.js
const { AttachmentMedia, User } = require("../models");
const b2AttachmentStorage = require("../utils/b2AttachmentStorage");
const path = require("path");
const { Op } = require("sequelize");

/**
 * Get all attachment media with filters
 */
exports.getAttachmentMedia = async (req, res) => {
  console.log(req.params);
  const { folderId } = req.params;
  try {
    const medias = await AttachmentMedia.findAll({
      where: { folder_id: folderId },
    });

    const images = medias.filter((media) => media.media_type === "image");
    const videos = medias.filter((media) => media.media_type === "video");

    res.status(200).json({ status: "Ok", images: images, videos: videos });
  } catch (error) {
    console.log(error);
  }
};

/**
 * Get attachment media by ID
 */
exports.getAttachmentMediaById = async (req, res) => {
  const { media_id } = req.params;

  try {
    const media = await AttachmentMedia.findOne({
      where: {
        attachment_media_id: parseInt(media_id),
        is_active: true,
      },
      include: [
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name", "user_email"],
        },
      ],
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error("❌ Get attachment media by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

/**
 * Get attachment media by style number
 */
exports.getAttachmentMediaByStyle = async (req, res) => {
  const { style_no } = req.params;
  const { media_type } = req.query;

  try {
    const whereClause = {
      style_no: {
        [Op.like]: `%${style_no}%`,
      },
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

    const media = await AttachmentMedia.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: media,
      count: media.length,
    });
  } catch (error) {
    console.error("❌ Get attachment media by style error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

/**
 * Upload attachment media (image or video)
 */
exports.uploadAttachmentMedia = async (req, res) => {
  console.log(req.body);
  // Check if file exists
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // Extract form data
  const {
    styleNo,
    description,
    mediaType: bodyMediaType,
    folderName: folderId,
  } = req.body;

  if (!folderId) {
    return res.status(400).json({
      success: false,
      message: "Folder ID required",
    });
    return;
  }

  // Validate required fields
  //   if (!styleNo) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "Style Number is required",
  //     });
  //   }

  // if (!description || description.trim().length < 10) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Description is required and must be at least 10 characters",
  //   });
  // }

  // Determine media type from request or file
  const mediaType =
    bodyMediaType ||
    (req.file.mimetype.startsWith("video/") ? "video" : "image");

  try {
    // Prepare filename
    const timestamp = Date.now();
    const originalExt = path.extname(req.file.originalname);
    const sanitizedName = `Attachment_${styleNo}_${timestamp}${originalExt}`
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .substring(0, 200);

    console.log(`📤 Starting attachment ${mediaType} upload:`, {
      styleNo: styleNo || null,
      originalName: req.file.originalname,
      generatedName: sanitizedName,
      size: req.file.size,
      mediaType: mediaType,
    });

    // Upload to B2 - you'll need to create a B2 utility for attachments
    // For now, using the same pattern as jig operations but with different path
    const uploadResult = await b2AttachmentStorage.uploadAttachmentMedia(
      req.file.buffer,
      sanitizedName,
      mediaType,
    );

    // Save to database
    const dbRecord = await AttachmentMedia.create({
      file_name: req.file.originalname,
      media_url: uploadResult.filePath,
      b2_file_id: uploadResult.fileId,
      file_size: req.file.size,
      mime_type: req.file.mimetype.split(";")[0],
      media_type: mediaType,
      description: description.trim() || "",
      folder_id: parseInt(folderId),
      style_no: styleNo,
      uploaded_by: req.user?.userId,
      is_active: true,
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: `Attachment ${mediaType} uploaded successfully`,
      data: {
        attachment_media_id: dbRecord.attachment_media_id,
        file_name: dbRecord.file_name,
        media_url: dbRecord.media_url,
        file_size: dbRecord.file_size,
        media_type: dbRecord.media_type,
        description: dbRecord.description,
        style_no: dbRecord.style_no,
        uploaded_by: dbRecord.uploaded_by,
        created_at: dbRecord.created_at,
      },
    });
  } catch (error) {
    console.error(`❌ Attachment ${mediaType} upload error:`, error);

    res.status(500).json({
      success: false,
      message: `Failed to upload attachment ${mediaType}`,
      error: error.message,
    });
  }
};

/**
 * Delete attachment media (soft delete)
 */
exports.deleteAttachmentMedia = async (req, res) => {
  const { media_id } = req.params;

  if (!media_id) {
    return res.status(400).json({
      success: false,
      message: "Media ID is required",
    });
  }

  try {
    // Find the media record
    const mediaRecord = await AttachmentMedia.findOne({
      where: {
        attachment_media_id: parseInt(media_id),
        is_active: true,
      },
    });

    if (!mediaRecord) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    // Check if user owns this media
    if (mediaRecord.uploaded_by !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this media",
      });
    }

    // Delete from B2 storage
    if (mediaRecord.b2_file_id && mediaRecord.media_url) {
      try {
        await b2AttachmentStorage.deleteFile(
          mediaRecord.b2_file_id,
          mediaRecord.media_url,
        );
        console.log(`✅ Deleted from B2: ${mediaRecord.media_url}`);
      } catch (b2Error) {
        console.error(
          "⚠️ B2 deletion failed but continuing with soft delete:",
          b2Error,
        );
        // Continue with soft delete even if B2 deletion fails
      }
    }

    // Soft delete from database
    await mediaRecord.update({
      is_active: false,
      deleted_at: new Date(),
    });

    // Return success
    res.status(200).json({
      success: true,
      message: "Attachment media deleted successfully",
      data: {
        attachment_media_id: parseInt(media_id),
        file_name: mediaRecord.file_name,
        media_type: mediaRecord.media_type,
      },
    });
  } catch (error) {
    console.error("❌ Delete attachment media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete media",
      error: error.message,
    });
  }
};

/**
 * Get distinct style numbers from attachment media
 */
exports.getDistinctStyles = async (req, res) => {
  try {
    const styles = await AttachmentMedia.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("style_no")), "style_no"],
      ],
      where: {
        is_active: true,
        style_no: {
          [Op.ne]: null,
        },
      },
      order: [["style_no", "ASC"]],
      raw: true,
    });

    const styleList = styles
      .map((item) => item.style_no)
      .filter((style) => style && style.trim() !== "");

    res.status(200).json({
      success: true,
      data: styleList,
      count: styleList.length,
    });
  } catch (error) {
    console.error("❌ Get distinct styles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch styles",
      error: error.message,
    });
  }
};
