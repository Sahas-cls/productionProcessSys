const { Style } = require("../models");
const { Helper } = require("../models");
const { HelperVideo, HelperImage, User } = require("../models");
const b2HelperStorage = require("../utils/b2HelperStorage");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// to get uploaded video according to the specific sub operation

exports.getVideos = async (req, res, next) => {
  const { hOpId } = req.params;
  console.log("📹 [B2] Fetching videos for hOpId:", hOpId);

  if (isNaN(hOpId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid hOpId",
    });
  }

  try {
    const videos = await HelperVideo.findAll({
      where: { helper_id: parseInt(hOpId) },
      include: [
        { model: Style, as: "style" },
        { model: Helper, as: "helper_operation" },
      ],
      order: [["createdAt", "DESC"]], // Newest first
    });

    console.log(`✅ Found ${videos.length} videos for hOpId ${hOpId}`);

    // Transform videos to include proxy URLs for frontend
    const videosWithUrls = videos.map((video) => {
      const videoData = video.toJSON();

      // Add proxy URL for frontend access
      if (videoData.media_url) {
        videoData.video_url_proxy = `/api/b2-files/${videoData.media_url}`;
      }

      // If you want to keep both URLs for reference
      videoData.video_url_original = videoData.media_url;

      // Optional: Add direct B2 URL if bucket is public
      // videoData.video_url_direct = `https://s3.eu-central-003.backblazeb2.com/${process.env.B2_BUCKET_NAME}/${videoData.media_url}`;

      return videoData;
    });

    res.status(200).json({
      status: "success",
      data: videosWithUrls,
      count: videos.length,
      storage_type: "backblaze_b2",
      proxy_base: "/api/b2-files/",
    });
  } catch (error) {
    console.error("❌ Error while fetching videos:", error);
    return next(error);
  }
};

exports.uploadVideos = async (req, res, next) => {
  console.log("📤 [Helper] Video upload request received");
  console.log("📋 Request body:", req.body);
  console.log(
    "📁 File details:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferSize: req.file.buffer?.length || 0,
        }
      : "No file",
  );

  let uploadResult = null;
  let dbRecord = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No video file uploaded",
        success: false,
      });
    }

    const { hOpName, hoId, styleNo } = req.body;

    if (!hoId) {
      return res.status(400).json({
        message: "Missing required field: hoId",
        success: false,
      });
    }

    if (!styleNo) {
      return res.status(400).json({
        message: "Missing required field: styleNo",
        success: false,
      });
    }

    // ================= VALIDATIONS =================
    const styleRecord = await Style.findOne({
      where: { style_no: styleNo },
    });

    if (!styleRecord) {
      return res.status(400).json({
        message: `Style with styleNo "${styleNo}" not found`,
        success: false,
      });
    }

    const styleIdDb = styleRecord.style_id;

    const helperOperationExists = await Helper.findByPk(hoId);
    if (!helperOperationExists) {
      return res.status(400).json({
        message: `Helper operation with ID "${hoId}" not found`,
        success: false,
      });
    }

    // ================= FILE PREPARATION =================
    const ext = path.extname(req.file.originalname).toLowerCase();

    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours(),
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(
      2,
      "0",
    )}${String(now.getSeconds()).padStart(2, "0")}`;

    const sanitizedHOpName = (hOpName || "helper_op")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 50);

    const finalFilename =
      req.file.generatedName ||
      `helper_${hoId}_${styleNo}_${sanitizedHOpName}_${dateTime}${ext}`;

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        message: "Uploaded file is empty",
        success: false,
      });
    }

    console.log(
      `⬆️ Uploading to B2: ${finalFilename} (${(
        req.file.size /
        1024 /
        1024
      ).toFixed(2)}MB)`,
    );

    // ================= DIRECT UPLOAD =================
    uploadResult = await b2HelperStorage.uploadHelperFile(
      req.file.buffer, // 🔥 direct upload
      finalFilename,
      "hVideo",
      hoId,
    );

    // ================= DB SAVE =================
    dbRecord = await HelperVideo.create({
      helper_id: hoId,
      style_id: styleIdDb,
      original_file_name: req.file.originalname,
      video_url: uploadResult.filePath,
      b2_file_id: uploadResult.fileId,
      file_size: req.file.size, // ✅ original size
      file_type: req.file.mimetype,
      user_id: req.user?.userId || null,
    });

    // ================= RESPONSE =================
    res.status(201).json({
      message: "Helper operation video uploaded successfully",
      success: true,
      data: dbRecord,
    });
  } catch (error) {
    console.error("❌ Unhandled error:", error);

    // rollback upload
    if (uploadResult?.fileId) {
      await b2HelperStorage.deleteFile(
        uploadResult.fileId,
        uploadResult.filePath,
      );
    }

    // rollback DB
    if (dbRecord?.helper_video_id) {
      await HelperVideo.destroy({
        where: { helper_video_id: dbRecord.helper_video_id },
      });
    }

    res.status(500).json({
      message: "Failed to upload helper operation video",
      success: false,
    });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const { ho_media_id } = req.params;

    if (!ho_media_id) {
      return res.status(400).json({
        message: "Missing required parameter: ho_media_id is required",
      });
    }

    const videoRec = await HelperVideo.findByPk(ho_media_id);

    if (!videoRec) {
      return res.status(404).json({
        message: "Video record not found",
      });
    }

    const B2 = require("backblaze-b2");
    const b2 = new B2({
      applicationKeyId: process.env.B2_KEY_ID,
      applicationKey: process.env.B2_APP_KEY,
    });

    // 🔥 Step 1: Delete from Backblaze if fileId exists
    if (videoRec.b2_file_id) {
      try {
        await b2.authorize();

        await b2.deleteFileVersion({
          fileId: videoRec.b2_file_id,
          fileName: videoRec.video_url,
        });

        console.log("File deleted from B2 successfully");
      } catch (b2Error) {
        if (b2Error?.response?.status === 404) {
          console.log("File not found in B2. Continuing DB deletion...");
        } else {
          console.error("B2 deletion failed:", b2Error);
          return res.status(500).json({
            message: "Failed to delete file from storage",
          });
        }
      }
    }

    //  Step 2: Delete from Database
    await videoRec.destroy();

    return res.status(200).json({
      status: "ok",
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    return res.status(500).json({
      message: "Something went wrong while deleting video",
    });
  }
};

// NOTE helper image handling
// Helper Image Upload Controller
exports.uploadImage = async (req, res, next) => {
  console.log("📤 [B2 Helper] Image upload request received");
  console.log("📋 Request body:", req.body);
  console.log(
    "📁 File details:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferSize: req.file.buffer?.length || 0,
        }
      : "No file",
  );

  let uploadResult = null;
  let dbRecord = null;

  try {
    // Check if file uploaded
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { hOpName, hoId, styleNo, helperId, styleId } = req.body;
    console.log("req.body, ", req.body);
    // return;

    const style = await Style.findOne({ where: { style_no: styleNo } });

    if (!style) {
      const error = new Error("Cannot find the provided style");
      error.status = 401;
      throw error;
    }

    // Validate required fields for helper operation
    if (!hoId) {
      console.log("❌ Missing required fields:", { hoId, hOpName, styleNo });
      return res.status(400).json({
        message: "Missing required fields: hoId is required",
        success: false,
      });
    }

    if (!hOpName) {
      console.log("❌ Missing helper operation name");
      return res.status(400).json({
        message: "Missing required fields: hOpName is required",
        success: false,
      });
    }

    if (!styleNo) {
      console.log("❌ Missing style number");
      return res.status(400).json({
        message: "Missing required fields: styleNo is required",
        success: false,
      });
    }

    // Generate filename with timestamp
    const ext = path.extname(req.file.originalname).toLowerCase();
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours(),
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds(),
    ).padStart(2, "0")}`;

    // Sanitize operation name for filename
    const sanitizedHOpName = (hOpName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 50); // Limit length

    // Generate unique filename
    const uniqueId = `${dateTime}_${Math.random().toString(36).substring(2, 8)}`;
    const filename =
      req.file.generatedName ||
      `${styleNo}_${hoId}_${sanitizedHOpName}_${uniqueId}${ext}`;

    console.log("📁 Generated filename:", filename);
    console.log("📊 File buffer size:", req.file.buffer?.length || 0, "bytes");

    // Validate file buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.log("❌ File buffer is empty");
      return res.status(400).json({
        message: "Uploaded file is empty or corrupted",
        success: false,
      });
    }

    // ==================== UPLOAD TO BACKBLAZE B2 ====================
    console.log("☁️ Uploading to Backblaze B2 (Helper)...");

    try {
      // Upload file to B2 using helper storage
      uploadResult = await b2HelperStorage.uploadHelperFile(
        req.file.buffer,
        filename,
        "image", // This will put it in HelperOpImages folder
        hoId, // Helper operation ID for folder organization
      );

      console.log("✅ B2 Helper Upload Successful:", {
        filePath: uploadResult.filePath,
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
      });
    } catch (b2Error) {
      console.error("❌ B2 Helper Upload Failed:", {
        error: b2Error.message,
        code: b2Error.code,
        stack: b2Error.stack?.split("\n")[0],
      });

      let errorMessage = "Failed to upload image to cloud storage";
      let statusCode = 500;

      if (
        b2Error.code === "AccessDenied" ||
        b2Error.code === "InvalidAccessKeyId"
      ) {
        errorMessage = "Cloud storage authentication failed";
        statusCode = 503;
      } else if (b2Error.code === "NoSuchBucket") {
        errorMessage = "Cloud storage bucket not found";
        statusCode = 503;
      } else if (
        b2Error.message.includes("ENOTFOUND") ||
        b2Error.message.includes("ECONNREFUSED")
      ) {
        errorMessage = "Cannot connect to cloud storage";
        statusCode = 503;
      }

      return res.status(statusCode).json({
        message: errorMessage,
        error:
          process.env.NODE_ENV === "development" ? b2Error.message : undefined,
        success: false,
        storage: "backblaze_b2",
      });
    }

    // ==================== SAVE TO DATABASE ====================
    console.log("💾 Saving to helper_images database...");

    try {
      // Create record in helper_images table
      dbRecord = await HelperImage.create({
        helper_id: parseInt(hoId),
        style_id: parseInt(style.style_id),
        original_file_name: req.file.originalname,
        image_url: uploadResult.filePath,
        b2_file_id: uploadResult.fileId,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        user_id: req.user?.userId || req.user?.user_id || null,
      });

      console.log("✅ Database record created:", {
        helper_image_id: dbRecord.helper_image_id,
        helper_id: dbRecord.helper_id,
        image_url: dbRecord.image_url,
        b2_file_id: dbRecord.b2_file_id,
      });
    } catch (dbError) {
      console.error("❌ Database save failed:", {
        error: dbError.message,
        stack: dbError.stack,
        name: dbError.name,
      });

      // Attempt to delete from B2 since DB save failed
      if (uploadResult && uploadResult.fileId) {
        try {
          console.log("🧹 Cleaning up B2 file after DB failure...");
          await b2HelperStorage.deleteFile(
            uploadResult.fileId,
            uploadResult.filePath,
          );
          console.log("✅ B2 file cleaned up");
        } catch (cleanupError) {
          console.error("❌ Failed to clean up B2 file:", cleanupError);
        }
      }

      return res.status(500).json({
        message: "Failed to save image record to database",
        error:
          process.env.NODE_ENV === "development" ? dbError.message : undefined,
        success: false,
      });
    }

    // ==================== SUCCESS RESPONSE ====================
    console.log("🎉 Helper image upload completed successfully!");

    res.status(201).json({
      message: "Helper operation image uploaded to cloud storage successfully",
      success: true,
      data: {
        helper_image_id: dbRecord.helper_image_id,
        helper_id: dbRecord.helper_id,
        image_url: uploadResult.filePath,
        image_url_proxy: `/api/b2-files/${uploadResult.filePath}`,
        file_name: uploadResult.fileName,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        helper_operation_name: hOpName,
        uploaded_at: dbRecord.createdAt,
        b2_file_id: uploadResult.fileId,
      },
      storage: {
        type: "backblaze_b2",
        bucket: process.env.B2_BUCKET_NAME,
        folder: "HelperOpImages",
        region: "eu-central-003",
      },
    });
  } catch (error) {
    console.error("❌ Unhandled error in helper image upload:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Final cleanup if anything went wrong
    if (uploadResult && uploadResult.fileId) {
      try {
        console.log("🧹 Final cleanup of B2 file...");
        await b2HelperStorage.deleteFile(
          uploadResult.fileId,
          uploadResult.filePath,
        );
      } catch (cleanupError) {
        console.error("❌ Final cleanup failed:", cleanupError);
      }
    }

    // Clean up DB record if it was created
    if (dbRecord && dbRecord.helper_image_id) {
      try {
        console.log("🧹 Final cleanup of database record...");
        await HelperImage.destroy({
          where: { helper_image_id: dbRecord.helper_image_id },
        });
      } catch (dbCleanupError) {
        console.error("❌ Database cleanup failed:", dbCleanupError);
      }
    }

    res.status(500).json({
      message: "Failed to upload helper operation image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

exports.getVideos = async (req, res, next) => {
  const { hOpId } = req.params;
  console.log("📹 [B2 Helper] Fetching videos for helper operation ID:", hOpId);

  if (!hOpId || isNaN(hOpId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid helper operation ID",
    });
  }

  try {
    const videos = await HelperVideo.findAll({
      where: { helper_id: parseInt(hOpId) },
      include: [
        { model: Style, as: "style" },
        { model: Helper, as: "helper_operation" },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${videos.length} videos for helper ID ${hOpId}`);

    const videosWithUrls = videos.map((video) => {
      const videoData = video.toJSON();
      if (videoData.image_url) {
        videoData.video_url_proxy = `/api/b2-files/${videoData.image_url}`;
      }
      return videoData;
    });

    res.status(200).json({
      status: "success",
      data: videosWithUrls,
      count: videos.length,
      storage_type: "backblaze_b2",
      proxy_base: "/api/b2-files/",
    });
  } catch (error) {
    console.error("❌ Error while fetching helper videos:", error);
    return next(error);
  }
};

// Get images for helper operation
exports.getImages = async (req, res, next) => {
  const { hOpId } = req.params;
  console.log("🖼️ [B2 Helper] Fetching images for helper operation ID:", hOpId);

  if (!hOpId || isNaN(hOpId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid helper operation ID",
    });
  }

  try {
    const images = await HelperImage.findAll({
      where: { helper_id: parseInt(hOpId) },
      include: [
        { model: Style, as: "style" },
        { model: Helper, as: "helper_operation" },
        {
          model: User,
          as: "user",
          attributes: ["user_id", "user_name", "user_email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${images.length} images for helper ID ${hOpId}`);

    const imagesWithUrls = images.map((image) => {
      const imageData = image.toJSON();
      if (imageData.image_url) {
        imageData.image_url_proxy = `/api/b2-files/${imageData.image_url}`;
      }
      return imageData;
    });

    res.status(200).json({
      status: "success",
      data: imagesWithUrls,
      count: images.length,
      storage_type: "backblaze_b2",
      proxy_base: "/api/b2-files/",
    });
  } catch (error) {
    console.error("❌ Error while fetching helper images:", error);
    return next(error);
  }
};

// Delete helper image
exports.deleteImage = async (req, res, next) => {
  const { imageId } = req.params;
  console.log("Image id: ", imageId);
  console.log("🗑️ [B2 Helper] Delete image request for ID:", imageId);

  if (!imageId || isNaN(imageId)) {
    return res.status(400).json({
      message: "Invalid image ID",
      success: false,
    });
  }

  let imageRecord = null;

  try {
    // Find the image record
    imageRecord = await HelperImage.findByPk(imageId);

    if (!imageRecord) {
      console.log("❌ Image not found in database");
      return res.status(404).json({
        message: "Image not found",
        success: false,
      });
    }

    console.log("📸 Found image record:", {
      helper_image_id: imageRecord.helper_image_id,
      helper_id: imageRecord.helper_id,
      image_url: imageRecord.image_url,
      b2_file_id: imageRecord.b2_file_id,
    });

    // Delete from B2 if we have file ID
    if (imageRecord.b2_file_id && imageRecord.image_url) {
      try {
        console.log("☁️ Deleting from Backblaze B2...");
        await b2HelperStorage.deleteFile(
          imageRecord.b2_file_id,
          imageRecord.image_url,
        );
        console.log("✅ B2 deletion successful");
      } catch (b2Error) {
        console.error("❌ B2 deletion failed:", b2Error);
        // Continue with DB deletion even if B2 fails
      }
    }

    // Delete from database
    await imageRecord.destroy();
    console.log("✅ Database record deleted");

    res.status(200).json({
      message: "Image deleted successfully",
      success: true,
      data: {
        helper_image_id: imageRecord.helper_image_id,
        deleted: true,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting image:", error);
    res.status(500).json({
      message: "Failed to delete image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};
