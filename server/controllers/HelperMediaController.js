const { Style } = require("../models");
const { Helper } = require("../models");
const { HelperVideo, HelperImage, User } = require("../models");
const localStorage = require("../utils/HFileStorageService"); // CHANGED: Import local storage instead of B2
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// ==================== HELPER VIDEO CONTROLLERS ====================

/**
 * Get videos for a specific helper operation
 */
exports.getVideos = async (req, res, next) => {
  const { hOpId } = req.params;
  console.log("📹 [Local Helper] Fetching videos for hOpId:", hOpId);

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
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${videos.length} videos for hOpId ${hOpId}`);

    // Base URL for constructing full URLs
    const baseUrl =
      process.platform === "linux"
        ? "https://api.guston-vms.site"
        : `http://localhost:${process.env.PORT || 4000}`;

    // Transform videos to include local URLs for frontend
    const videosWithUrls = videos.map((video) => {
      const videoData = video.toJSON();

      // Extract filename from video_url
      let filename = videoData.video_url;
      if (filename && (filename.includes("/") || filename.includes("\\"))) {
        filename = filename.split(/[\/\\]/).pop();
      }

      // Add local video URL - ENCODE the filename properly
      if (filename) {
        // Encode the filename for URL safety
        const encodedFilename = encodeURIComponent(filename);
        videoData.video_url = `${baseUrl}/helper-videos/${encodedFilename}`;
        videoData.proxy_url = `/helper-videos/${encodedFilename}`;
      }

      return videoData;
    });

    res.status(200).json({
      status: "success",
      data: videosWithUrls,
      count: videos.length,
      storage_type: "local",
      message: "Videos fetched successfully from local storage",
    });
  } catch (error) {
    console.error("❌ Error while fetching videos:", error);
    return next(error);
  }
};

/**
 * Upload video for helper operation
 */
exports.uploadVideos = async (req, res, next) => {
  console.log("📤 [Local Helper] Video upload request received");
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
  let tempInputPath = null;
  let tempOutputPath = null;
  let sizeControlledPath = null;
  let secondPassPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No video file uploaded",
        success: false,
      });
    }

    const {
      hOpName,
      hoId,
      styleNo,
      recordingDuration,
      videoQuality,
      originalSize,
      compressedSize,
    } = req.body;

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

    // Validate style exists
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

    // Validate helper operation exists
    const helperOperationExists = await Helper.findByPk(hoId);
    if (!helperOperationExists) {
      return res.status(400).json({
        message: `Helper operation with ID "${hoId}" not found`,
        success: false,
      });
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const ext = path.extname(req.file.originalname).toLowerCase();
    let processedBuffer = req.file.buffer;
    let finalFilename = "";
    let wasNormalized = false;

    // ==================== VIDEO PROCESSING ====================
    if (isVideo) {
      try {
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        tempInputPath = path.join(tempDir, `helper_input_${Date.now()}${ext}`);
        tempOutputPath = path.join(
          tempDir,
          `helper_output_${Date.now()}${ext}`,
        );

        await fs.promises.writeFile(tempInputPath, req.file.buffer);

        // Check for rotation metadata
        const hasRotation = await new Promise((resolve) => {
          ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
            if (err) return resolve(false);
            const videoStream = metadata.streams?.find(
              (s) => s.codec_type === "video",
            );
            const rotate =
              videoStream?.tags?.rotate ??
              videoStream?.side_data_list?.[0]?.rotation;
            resolve(Boolean(rotate));
          });
        });

        // Fix rotation if needed
        if (hasRotation) {
          try {
            await new Promise((resolve, reject) => {
              ffmpeg(tempInputPath)
                .outputOptions(["-map_metadata 0", "-c copy"])
                .on("end", resolve)
                .on("error", reject)
                .save(tempOutputPath);
            });
          } catch {
            // If metadata removal fails, physically rotate
            await new Promise((resolve, reject) => {
              ffmpeg(tempInputPath)
                .videoFilters("transpose=1")
                .outputOptions(["-map_metadata 0"])
                .on("end", resolve)
                .on("error", reject)
                .save(tempOutputPath);
            });
          }

          processedBuffer = await fs.promises.readFile(tempOutputPath);
          req.file.size = processedBuffer.length;
          wasNormalized = true;
          console.log("✅ Video orientation normalized");
        }

        // ==================== SIZE CONTROL COMPRESSION ====================
        const MAX_SIZE_MB = 95;
        const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

        const compressionSourcePath = wasNormalized
          ? tempOutputPath
          : tempInputPath;

        if (processedBuffer.length > MAX_SIZE_BYTES) {
          console.log("🎯 Applying size control compression...");

          const duration = await new Promise((resolve) => {
            ffmpeg.ffprobe(compressionSourcePath, (err, metadata) => {
              if (err) return resolve(60);
              resolve(metadata.format?.duration || 60);
            });
          });

          const audioBitrate = 128000;
          const targetSizeBits = MAX_SIZE_BYTES * 8;

          let videoBitrate =
            Math.floor(targetSizeBits / duration) - audioBitrate;

          videoBitrate = Math.max(800000, Math.min(videoBitrate, 2500000));
          const bitrateK = Math.floor(videoBitrate / 1000) + "k";

          sizeControlledPath = path.join(
            path.dirname(tempInputPath),
            `helper_size_${Date.now()}.mp4`,
          );

          await new Promise((resolve, reject) => {
            ffmpeg(compressionSourcePath)
              .videoCodec("libx264")
              .audioCodec("aac")
              .outputOptions([
                "-preset veryfast",
                "-movflags +faststart",
                "-vf scale='min(1280,iw)':-2",
                "-b:v " + bitrateK,
                "-maxrate " + bitrateK,
                "-bufsize 2M",
                "-b:a 128k",
              ])
              .on("end", resolve)
              .on("error", reject)
              .save(sizeControlledPath);
          });

          let finalBuffer = await fs.promises.readFile(sizeControlledPath);

          // Second pass if still too big
          if (finalBuffer.length > MAX_SIZE_BYTES) {
            console.log("🔁 Second compression pass...");

            const reducedBitrate = Math.floor(videoBitrate * 0.8);
            const reducedBitrateK = Math.floor(reducedBitrate / 1000) + "k";

            secondPassPath = path.join(
              path.dirname(tempInputPath),
              `helper_second_${Date.now()}.mp4`,
            );

            await new Promise((resolve, reject) => {
              ffmpeg(sizeControlledPath)
                .videoCodec("libx264")
                .audioCodec("aac")
                .outputOptions([
                  "-preset veryfast",
                  "-movflags +faststart",
                  "-vf scale='min(1280,iw)':-2",
                  "-b:v " + reducedBitrateK,
                  "-maxrate " + reducedBitrateK,
                  "-bufsize 2M",
                  "-b:a 128k",
                ])
                .on("end", resolve)
                .on("error", reject)
                .save(secondPassPath);
            });

            finalBuffer = await fs.promises.readFile(secondPassPath);
          }

          processedBuffer = finalBuffer;
          req.file.size = finalBuffer.length;

          console.log(
            `✅ Final compressed size: ${(processedBuffer.length / 1024 / 1024).toFixed(2)} MB`,
          );
        }
      } catch (err) {
        console.warn("⚠️ Video processing failed:", err.message);
        // Continue with original buffer if processing fails
      }
    }

    // ==================== GENERATE FILENAME ====================
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

    finalFilename =
      req.file.generatedName ||
      `helper_${hoId}_${styleNo}_${sanitizedHOpName}_${dateTime}.mp4`;

    if (!processedBuffer || processedBuffer.length === 0) {
      return res.status(400).json({
        message: "Processed video file is empty",
        success: false,
      });
    }

    console.log(
      `⬆️ Saving to local storage: ${finalFilename} (${(
        processedBuffer.length /
        1024 /
        1024
      ).toFixed(2)}MB)`,
    );

    // ==================== UPLOAD TO LOCAL STORAGE ====================
    // CHANGED: Using localStorage instead of b2HelperStorage
    uploadResult = await localStorage.uploadSubOpFile(
      processedBuffer,
      finalFilename,
      "video", // This will put it in HelperOpVideos folder
      hoId, // Helper operation ID (not used for subfolder creation)
    );

    // ==================== SAVE TO DATABASE ====================
    // CHANGED: Removed b2_file_id from database creation
    dbRecord = await HelperVideo.create({
      helper_id: hoId,
      style_id: styleIdDb,
      original_file_name: req.file.originalname,
      video_url: uploadResult.filePath, // Stores relative path like "HelperOpVideos/filename.mp4"
      // b2_file_id removed
      file_size: req.file.size,
      file_type: req.file.mimetype,
      user_id: req.user?.userId || null,
    });

    // ==================== CLEANUP TEMP FILES ====================
    const filesToDelete = [
      tempInputPath,
      tempOutputPath,
      sizeControlledPath,
      secondPassPath,
    ];

    for (const file of filesToDelete) {
      if (file && fs.existsSync(file)) {
        await fs.promises
          .unlink(file)
          .catch((err) =>
            console.log(`⚠️ Could not delete temp file ${file}:`, err.message),
          );
      }
    }

    // ==================== SUCCESS RESPONSE ====================
    res.status(201).json({
      message: "Helper operation video uploaded successfully",
      success: true,
      data: {
        helper_video_id: dbRecord.helper_video_id,
        helper_id: dbRecord.helper_id,
        video_url: uploadResult.filePath,
        video_url_proxy: `/api/local-files/${uploadResult.filePath}`,
        original_file_name: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        uploaded_at: dbRecord.createdAt,
      },
      storage: {
        type: "local",
        path: "Y:/HelperOpVideos",
      },
    });
  } catch (error) {
    console.error("❌ Unhandled error:", error);

    // ==================== CLEANUP ON ERROR ====================
    // Cleanup local file if uploaded
    if (uploadResult?.filePath) {
      try {
        await localStorage.deleteFile(null, uploadResult.filePath);
        console.log("🧹 Cleaned up local file after error");
      } catch (localError) {
        console.error("❌ Failed to cleanup local file:", localError.message);
      }
    }

    // Cleanup database record if created
    if (dbRecord?.helper_video_id) {
      await HelperVideo.destroy({
        where: { helper_video_id: dbRecord.helper_video_id },
      }).catch((err) =>
        console.log("⚠️ Could not delete DB record:", err.message),
      );
    }

    // Cleanup temp files
    const filesToDelete = [
      tempInputPath,
      tempOutputPath,
      sizeControlledPath,
      secondPassPath,
    ];

    for (const file of filesToDelete) {
      if (file && fs.existsSync(file)) {
        await fs.promises
          .unlink(file)
          .catch((err) =>
            console.log(`⚠️ Could not delete temp file ${file}:`, err.message),
          );
      }
    }

    res.status(500).json({
      message: "Failed to upload helper operation video",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete helper video
 */
exports.deleteVideo = async (req, res, next) => {
  const { videoId } = req.params;

  try {
    const video = await HelperVideo.findByPk(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Delete the file from local storage
    if (video.video_url) {
      let filename = video.video_url;
      if (filename.includes("/") || filename.includes("\\")) {
        filename = filename.split(/[\/\\]/).pop();
      }

      const videoPath = path.join(STORAGE_UNC_PATH, "HelperOpVideos", filename);

      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        console.log(`✅ Deleted video file: ${videoPath}`);
      }
    }

    // Delete database record
    await video.destroy();

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    return next(error);
  }
};

// ==================== HELPER IMAGE CONTROLLERS ====================

/**
 * Upload image for helper operation
 */
exports.uploadImage = async (req, res, next) => {
  console.log("📤 [Local Helper] Image upload request received");
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

    const { hOpName, hoId, styleNo } = req.body;
    console.log("req.body:", req.body);

    // Find style
    const style = await Style.findOne({ where: { style_no: styleNo } });

    if (!style) {
      const error = new Error("Cannot find the provided style");
      error.status = 401;
      throw error;
    }

    // Validate required fields
    if (!hoId) {
      console.log("❌ Missing required fields:", { hoId, hOpName, styleNo });
      return res.status(400).json({
        message: "Missing required field: hoId is required",
        success: false,
      });
    }

    if (!hOpName) {
      console.log("❌ Missing helper operation name");
      return res.status(400).json({
        message: "Missing required field: hOpName is required",
        success: false,
      });
    }

    if (!styleNo) {
      console.log("❌ Missing style number");
      return res.status(400).json({
        message: "Missing required field: styleNo is required",
        success: false,
      });
    }

    // ==================== GENERATE FILENAME ====================
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

    const sanitizedHOpName = (hOpName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 50);

    const uniqueId = `${dateTime}_${Math.random().toString(36).substring(2, 8)}`;
    const filename =
      req.file.generatedName ||
      `${styleNo}_${hoId}_${sanitizedHOpName}_${uniqueId}${ext}`;

    console.log("📁 Generated filename:", filename);

    // Validate file buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.log("❌ File buffer is empty");
      return res.status(400).json({
        message: "Uploaded file is empty or corrupted",
        success: false,
      });
    }

    // ==================== UPLOAD TO LOCAL STORAGE ====================
    console.log("💾 Saving to local storage (Helper)...");

    try {
      // CHANGED: Using localStorage instead of b2HelperStorage
      uploadResult = await localStorage.uploadSubOpFile(
        req.file.buffer,
        filename,
        "image", // This will put it in HelperOpImages folder
        hoId, // Helper operation ID
      );

      console.log("✅ Local Helper Upload Successful:", {
        filePath: uploadResult.filePath,
        fileName: uploadResult.fileName,
      });
    } catch (localError) {
      console.error("❌ Local Helper Upload Failed:", {
        error: localError.message,
        stack: localError.stack?.split("\n")[0],
      });

      return res.status(500).json({
        message: "Failed to save image to local storage",
        error:
          process.env.NODE_ENV === "development"
            ? localError.message
            : undefined,
        success: false,
        storage: "local",
      });
    }

    // ==================== SAVE TO DATABASE ====================
    console.log("💾 Saving to helper_images database...");

    try {
      // CHANGED: Removed b2_file_id from database creation
      dbRecord = await HelperImage.create({
        helper_id: parseInt(hoId),
        style_id: parseInt(style.style_id),
        original_file_name: req.file.originalname,
        image_url: uploadResult.filePath, // Stores relative path like "HelperOpImages/filename.jpg"
        // b2_file_id removed
        file_size: req.file.size,
        file_type: req.file.mimetype,
        user_id: req.user?.userId || req.user?.user_id || null,
      });

      console.log("✅ Database record created:", {
        helper_image_id: dbRecord.helper_image_id,
        helper_id: dbRecord.helper_id,
        image_url: dbRecord.image_url,
      });
    } catch (dbError) {
      console.error("❌ Database save failed:", {
        error: dbError.message,
        stack: dbError.stack,
        name: dbError.name,
      });

      // Attempt to delete from local storage since DB save failed
      if (uploadResult && uploadResult.filePath) {
        try {
          console.log("🧹 Cleaning up local file after DB failure...");
          await localStorage.deleteFile(null, uploadResult.filePath);
          console.log("✅ Local file cleaned up");
        } catch (cleanupError) {
          console.error("❌ Failed to clean up local file:", cleanupError);
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
      message: "Helper operation image uploaded to local storage successfully",
      success: true,
      data: {
        helper_image_id: dbRecord.helper_image_id,
        helper_id: dbRecord.helper_id,
        image_url: uploadResult.filePath,
        image_url_proxy: `/api/local-files/${uploadResult.filePath}`, // CHANGED: from /api/b2-files/ to /api/local-files/
        file_name: uploadResult.fileName,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        helper_operation_name: hOpName,
        uploaded_at: dbRecord.createdAt,
      },
      storage: {
        type: "local",
        path: "Y:/HelperOpImages",
      },
    });
  } catch (error) {
    console.error("❌ Unhandled error in helper image upload:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Final cleanup if anything went wrong
    if (uploadResult && uploadResult.filePath) {
      try {
        console.log("🧹 Final cleanup of local file...");
        await localStorage.deleteFile(null, uploadResult.filePath);
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

/**
 * Get images for helper operation
 */
exports.getImages = async (req, res, next) => {
  const { hOpId } = req.params;
  console.log(
    "🖼️ [Local Helper] Fetching images for helper operation ID:",
    hOpId,
  );

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

    // Base URL for constructing full URLs
    const baseUrl =
      process.platform === "linux"
        ? "https://api.guston-vms.site"
        : `http://localhost:${process.env.PORT || 4000}`;

    const imagesWithUrls = images.map((image) => {
      const imageData = image.toJSON();

      // Extract filename from image_url
      let filename = imageData.image_url;
      if (filename && (filename.includes("/") || filename.includes("\\"))) {
        filename = filename.split(/[\/\\]/).pop();
      }

      // Add local image URL
      if (filename) {
        // Use the /images/ endpoint (same as sub-operation images)
        imageData.image_url = `${baseUrl}/helper-images/${filename}`;
        imageData.image_url_proxy = `/helper-images/${filename}`;
      }

      return imageData;
    });

    res.status(200).json({
      status: "success",
      data: imagesWithUrls,
      count: images.length,
      storage_type: "local",
      message: "Images fetched successfully from local storage",
    });
  } catch (error) {
    console.error("❌ Error while fetching helper images:", error);
    return next(error);
  }
};

/**
 * Delete helper image
 */
exports.deleteImage = async (req, res, next) => {
  const { imageId } = req.params;
  console.log("🗑️ [Local Helper] Delete image request for ID:", imageId);

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
    });

    // ==================== DELETE FROM LOCAL STORAGE ====================
    // CHANGED: Using localStorage instead of B2
    let fileDeleted = false;
    if (imageRecord.image_url) {
      try {
        console.log("🗑️ Deleting from local storage...");
        await localStorage.deleteFile(null, imageRecord.image_url);
        fileDeleted = true;
        console.log("✅ Local file deletion successful");
      } catch (localError) {
        console.error("❌ Local file deletion failed:", localError);
        // Continue with DB deletion even if file deletion fails
      }
    }

    // ==================== DELETE FROM DATABASE ====================
    await imageRecord.destroy();
    console.log("✅ Database record deleted");

    res.status(200).json({
      message: "Image deleted successfully",
      success: true,
      data: {
        helper_image_id: imageRecord.helper_image_id,
        deleted: true,
        file_deleted: fileDeleted,
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
