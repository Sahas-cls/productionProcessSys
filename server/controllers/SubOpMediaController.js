const {
  SubOperationMedia,
  SubOperationImages,
  SubOperationTechPack,
  SubOperationFolder,
  SubOperation,
  Style,
  MainOperation,
} = require("../models");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const localStorage = require("../utils/FileStorageService");
require("dotenv").config();

// Set the ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// ==================== VIDEO CONTROLLERS ====================

exports.uploadVideo = async (req, res, next) => {
  console.log("📤 [Local] Video upload request received");
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

  try {
    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleNo, moId, sopId, sopName, subOpId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId || !subOpId) {
      return res.status(400).json({
        message: "Missing required fields: styleNo, moId, sopId, subOpId",
        success: false,
        received: { styleNo, moId, sopId, subOpId },
      });
    }

    // ==================== VALIDATE FOREIGN KEYS ====================
    // Lookup style_id from styleNo
    const styleRecord = await Style.findOne({ where: { style_no: styleNo } });
    if (!styleRecord) {
      return res.status(400).json({
        message: `Style with styleNo "${styleNo}" not found`,
        success: false,
      });
    }
    const styleIdDb = styleRecord.style_id;

    // Validate moId exists in Operations table
    const operationExists = await MainOperation.findByPk(moId);
    if (!operationExists) {
      return res.status(400).json({
        message: `Operation with id "${moId}" not found`,
        success: false,
      });
    }

    // Validate subOpId exists in SubOperations table
    const subOperationExists = await SubOperation.findByPk(subOpId);
    if (!subOperationExists) {
      return res.status(400).json({
        message: `Sub-operation with id "${subOpId}" not found`,
        success: false,
      });
    }

    // ==================== VIDEO PROCESSING ====================
    const isVideo = req.file.mimetype.startsWith("video/");
    const ext = path.extname(req.file.originalname).toLowerCase();
    let processedBuffer = req.file.buffer;
    let finalFilename = "";
    let wasNormalized = false;
    let rotationApplied = null;

    if (isVideo) {
      try {
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        tempInputPath = path.join(tempDir, `input_${Date.now()}${ext}`);
        tempOutputPath = path.join(tempDir, `output_${Date.now()}${ext}`);
        await fs.promises.writeFile(tempInputPath, req.file.buffer);

        // Detect rotation metadata and get rotation value
        const rotationInfo = await new Promise((resolve) => {
          ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
            if (err) return resolve({ hasRotation: false, rotation: 0 });

            const videoStream = metadata.streams?.find(
              (s) => s.codec_type === "video",
            );

            let rotation = 0;
            if (videoStream?.tags?.rotate) {
              rotation = parseInt(videoStream.tags.rotate);
            } else if (videoStream?.side_data_list) {
              const rotateData = videoStream.side_data_list.find(
                (sd) => sd.rotation !== undefined,
              );
              if (rotateData) rotation = rotateData.rotation;
            }

            resolve({
              hasRotation: rotation !== 0,
              rotation: rotation,
            });
          });
        });

        // ALWAYS physically rotate for web compatibility if rotation detected
        if (rotationInfo.hasRotation) {
          console.log(
            `🔄 Detected rotation: ${rotationInfo.rotation}°, applying physical rotation for web compatibility`,
          );

          try {
            let transposeFilter = "transpose=1";

            if (rotationInfo.rotation === 90) {
              transposeFilter = "transpose=1";
            } else if (
              rotationInfo.rotation === 270 ||
              rotationInfo.rotation === -90
            ) {
              transposeFilter = "transpose=2";
            } else if (rotationInfo.rotation === 180) {
              transposeFilter = "transpose=1,transpose=1";
            }

            await new Promise((resolve, reject) => {
              ffmpeg(tempInputPath)
                .videoFilters(transposeFilter)
                .audioCodec("aac")
                .videoCodec("libx264")
                .outputOptions([
                  "-preset fast",
                  "-crf 23",
                  "-movflags +faststart",
                  "-map_metadata 0",
                  "-metadata:s:v:0 rotate=0",
                ])
                .on("start", (commandLine) => {
                  console.log("FFmpeg command:", commandLine);
                })
                .on("end", () => {
                  console.log("✅ Video rotated successfully");
                  resolve();
                })
                .on("error", (err) => {
                  console.error("FFmpeg rotation error:", err);
                  reject(err);
                })
                .save(tempOutputPath);
            });

            processedBuffer = await fs.promises.readFile(tempOutputPath);
            req.file.size = processedBuffer.length;
            wasNormalized = true;
            rotationApplied = rotationInfo.rotation;

            console.log(`✅ Video successfully rotated and optimized for web`);
          } catch (rotationError) {
            console.error(
              "❌ Rotation failed, falling back to metadata removal only:",
              rotationError.message,
            );

            try {
              await new Promise((resolve, reject) => {
                ffmpeg(tempInputPath)
                  .outputOptions([
                    "-c copy",
                    "-map_metadata 0",
                    "-metadata:s:v:0 rotate=0",
                  ])
                  .on("end", resolve)
                  .on("error", reject)
                  .save(tempOutputPath);
              });

              processedBuffer = await fs.promises.readFile(tempOutputPath);
              req.file.size = processedBuffer.length;
              wasNormalized = true;
              rotationApplied = "metadata_only";
              console.log(
                "⚠️ Removed rotation metadata only (video may still appear rotated in some players)",
              );
            } catch (fallbackError) {
              console.error(
                "❌ Even metadata removal failed:",
                fallbackError.message,
              );
            }
          }
        } else {
          console.log(
            "✅ No rotation detected, video orientation is web-compatible",
          );

          try {
            await new Promise((resolve, reject) => {
              ffmpeg(tempInputPath)
                .videoCodec("libx264")
                .audioCodec("aac")
                .outputOptions([
                  "-preset fast",
                  "-crf 23",
                  "-movflags +faststart",
                ])
                .on("end", resolve)
                .on("error", reject)
                .save(tempOutputPath);
            });

            processedBuffer = await fs.promises.readFile(tempOutputPath);
            req.file.size = processedBuffer.length;
            wasNormalized = true;
            console.log("✅ Video optimized for web playback");
          } catch (optimizeError) {
            console.log(
              "⚠️ Web optimization skipped, using original:",
              optimizeError.message,
            );
          }
        }
      } catch (err) {
        console.warn(
          "⚠️ Video processing failed, using original buffer:",
          err.message,
        );
      }
    }

    // ==================== GENERATE FILENAME ====================
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const sanitizedSopName = (sopName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    const webOptimizedSuffix = wasNormalized ? "_web_optimized" : "";
    finalFilename =
      req.file.generatedName ||
      `${styleNo}_${moId}_${sopId}_${sanitizedSopName}${webOptimizedSuffix}_${dateTime}${ext}`;

    if (!processedBuffer || processedBuffer.length === 0) {
      return res
        .status(400)
        .json({ message: "Processed file is empty", success: false });
    }

    // ==================== SIZE CONTROL ====================
    const MAX_SIZE_MB = 95;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (processedBuffer.length > MAX_SIZE_BYTES) {
      console.log("🎯 Applying size control compression...");

      const getVideoDuration = () =>
        new Promise((resolve) => {
          ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
            if (err) return resolve(60);
            const duration = metadata.format?.duration || 60;
            resolve(duration);
          });
        });

      const duration = await getVideoDuration();
      const audioBitrate = 128000;
      const targetSizeBits = MAX_SIZE_BYTES * 8;

      let videoBitrate = Math.floor(targetSizeBits / duration) - audioBitrate;
      videoBitrate = Math.max(800000, Math.min(videoBitrate, 2500000));
      const bitrateK = Math.floor(videoBitrate / 1000) + "k";

      console.log(`📉 Calculated video bitrate: ${bitrateK}`);

      const sizeControlledPath = path.join(
        path.dirname(tempOutputPath),
        `size_control_${Date.now()}.mp4`,
      );

      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
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

      if (finalBuffer.length > MAX_SIZE_BYTES) {
        console.log("🔁 Second compression pass...");

        const reducedBitrate = Math.floor(videoBitrate * 0.8);
        const reducedBitrateK = Math.floor(reducedBitrate / 1000) + "k";

        const secondPassPath = path.join(
          path.dirname(tempOutputPath),
          `second_pass_${Date.now()}.mp4`,
        );

        await new Promise((resolve, reject) => {
          ffmpeg(tempInputPath)
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
        await fs.promises.unlink(secondPassPath);
      }

      processedBuffer = finalBuffer;
      req.file.size = finalBuffer.length;
      await fs.promises.unlink(sizeControlledPath);

      console.log(
        `✅ Final compressed size: ${(processedBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
      );
    }

    // ==================== UPLOAD TO LOCAL STORAGE ====================
    uploadResult = await localStorage.uploadSubOpFile(
      processedBuffer,
      finalFilename,
      "video",
      subOpId,
    );

    // ==================== SAVE TO DATABASE ====================
    dbRecord = await SubOperationMedia.create({
      style_id: styleIdDb,
      operation_id: moId,
      sub_operation_id: subOpId,
      sub_operation_name: sopName || null,
      media_url: uploadResult.filePath,
      video_url: uploadResult.filePath,
      file_size: req.file.size,
      original_filename: req.file.originalname,
      uploaded_by: req.user?.userId || null,
      file_type: req.file.mimetype,
      processed_with_ffmpeg: wasNormalized,
      rotation_fixed: rotationApplied !== null,
      original_rotation: rotationApplied,
    });

    // ==================== CLEANUP TEMP FILES ====================
    try {
      [tempInputPath, tempOutputPath].forEach(async (p) => {
        if (p && fs.existsSync(p)) {
          await fs.promises.unlink(p);
          console.log(`🧹 Cleaned up temp file: ${p}`);
        }
      });
    } catch (cleanupError) {
      console.warn("⚠️ Temp file cleanup warning:", cleanupError.message);
    }

    // ==================== SUCCESS RESPONSE ====================
    res.status(201).json({
      message: "Video uploaded successfully",
      success: true,
      data: {
        so_media_id: dbRecord.so_media_id,
        media_url: uploadResult.filePath,
        video_url: uploadResult.filePath,
        video_url_proxy: `/api/local-files/${uploadResult.filePath}`,
        file_name: uploadResult.fileName,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        sub_operation_name: dbRecord.sub_operation_name,
        uploaded_at: dbRecord.createdAt,
        orientation_normalized: wasNormalized,
        rotation_fixed: rotationApplied !== null,
        web_optimized: true,
      },
      storage: {
        type: "local",
        path: "/mnt/bulletin-assets",
      },
    });
  } catch (error) {
    console.error("❌ Unhandled error:", error);

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
    if (dbRecord?.so_media_id) {
      try {
        await SubOperationMedia.destroy({
          where: { so_media_id: dbRecord.so_media_id },
        });
        console.log("🧹 Cleaned up database record after error");
      } catch (dbError) {
        console.error("❌ Failed to cleanup database:", dbError.message);
      }
    }

    // Cleanup temp files
    try {
      [tempInputPath, tempOutputPath].forEach(async (p) => {
        if (p && fs.existsSync(p)) {
          await fs.promises.unlink(p);
          console.log(`🧹 Cleaned up temp file after error: ${p}`);
        }
      });
    } catch (cleanupError) {
      console.warn("⚠️ Temp file cleanup warning:", cleanupError.message);
    }

    res.status(500).json({
      message: "Failed to upload video",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

exports.getVideos = async (req, res, next) => {
  const { subOpId } = req.params;
  console.log("📹 [Local] Fetching videos for subOpId:", subOpId);

  if (isNaN(subOpId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid subOpId",
    });
  }

  try {
    const videos = await SubOperationMedia.findAll({
      where: { sub_operation_id: parseInt(subOpId) },
      include: [
        { model: Style, as: "style" },
        { model: SubOperation, as: "sub_operation" },
        { model: MainOperation, as: "main_operation" },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${videos.length} videos for subOpId ${subOpId}`);

    const videosWithUrls = videos.map((video) => {
      const videoData = video.toJSON();

      if (videoData.media_url) {
        videoData.video_url_proxy = `/api/local-files/${videoData.media_url}`;
      }
      videoData.video_url_original = videoData.media_url;

      return videoData;
    });

    res.status(200).json({
      status: "success",
      data: videosWithUrls,
      count: videos.length,
      storage_type: "local",
      proxy_base: "/api/local-files/",
    });
  } catch (error) {
    console.error("❌ Error while fetching videos:", error);
    return next(error);
  }
};

exports.deleteVideo = async (req, res, next) => {
  try {
    const { so_media_id } = req.params;

    if (!so_media_id) {
      return res.status(400).json({
        message: "Missing required parameter: so_media_id is required",
      });
    }

    const videoRecord = await SubOperationMedia.findByPk(so_media_id);

    if (!videoRecord) {
      return res.status(404).json({
        message: "Video record not found",
      });
    }

    const filename = videoRecord.media_url || videoRecord.video_url;

    // Delete from local storage
    let fileDeleted = false;
    if (filename) {
      try {
        await localStorage.deleteFile(null, filename);
        fileDeleted = true;
        console.log("✅ File deleted from local storage");
      } catch (localError) {
        console.error("❌ Local storage deletion error:", localError);
      }
    }

    // Delete the database record
    await SubOperationMedia.destroy({
      where: { so_media_id: so_media_id },
    });

    res.status(200).json({
      message: "Video deleted successfully",
      details: {
        recordDeleted: true,
        fileDeleted: fileDeleted,
        filename: filename,
        storageProvider: "Local Storage",
      },
    });
  } catch (error) {
    console.error("Delete error:", error);

    res.status(500).json({
      message: "Server error during deletion",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// ==================== IMAGE CONTROLLERS ====================

exports.uploadImage = async (req, res, next) => {
  console.log("📤 [Local] Image upload request received");
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
      console.log("❌ No file uploaded");
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleNo, moId, sopId, sopName, styleId, subOpId } = req.body;

    if (!styleNo || !moId || !sopId || !subOpId) {
      console.log("❌ Missing required fields:", {
        styleNo,
        moId,
        sopId,
        subOpId,
      });
      return res.status(400).json({
        message:
          "Missing required fields: styleNo, moId, sopId, and subOpId are required",
        success: false,
      });
    }

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

    const sanitizedSopName = (sopName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    const filename =
      req.file.generatedName ||
      `${styleNo}_${moId}_${sopId}_${sanitizedSopName}_${dateTime}${ext}`;

    console.log("📁 Generated filename:", filename);

    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.log("❌ File buffer is empty");
      return res.status(400).json({
        message: "Uploaded file is empty or corrupted",
        success: false,
      });
    }

    // ==================== UPLOAD TO LOCAL STORAGE ====================
    console.log("💾 Saving to local storage...");

    try {
      uploadResult = await localStorage.uploadSubOpFile(
        req.file.buffer,
        filename,
        "image",
        subOpId,
      );

      console.log("✅ Local storage successful:", {
        filePath: uploadResult.filePath,
        fileName: uploadResult.fileName,
      });
    } catch (localError) {
      console.error("❌ Local storage failed:", {
        error: localError.message,
        stack: localError.stack?.split("\n")[0],
      });

      return res.status(500).json({
        message: "Failed to save image to storage",
        error:
          process.env.NODE_ENV === "development"
            ? localError.message
            : undefined,
        success: false,
        storage: "local",
      });
    }

    // ==================== SAVE TO DATABASE ====================
    console.log("💾 Saving to database...");

    try {
      dbRecord = await SubOperationImages.create({
        style_id: styleId || 1,
        operation_id: moId,
        sub_operation_id: sopId,
        sub_operation_name: sopName || null,
        image_url: uploadResult.filePath,
        file_size: req.file.size,
        original_filename: req.file.originalname,
        uploaded_by: req.user?.userId || null,
        file_type: req.file.mimetype,
        sub_op_id: subOpId,
      });

      console.log("✅ Database record created:", {
        so_img_id: dbRecord.so_img_id,
        image_url: dbRecord.image_url,
      });
    } catch (dbError) {
      console.error("❌ Database save failed:", dbError);

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

    console.log("🎉 Image upload completed successfully!");

    res.status(201).json({
      message: "Image uploaded to local storage successfully",
      success: true,
      data: {
        so_img_id: dbRecord.so_img_id,
        image_url: uploadResult.filePath,
        image_url_proxy: `/api/local-files/${uploadResult.filePath}`,
        file_name: uploadResult.fileName,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        sub_operation_name: dbRecord.sub_operation_name,
        uploaded_at: dbRecord.createdAt,
      },
      storage: {
        type: "local",
        path: "/mnt/bulletin-assets",
      },
    });
  } catch (error) {
    console.error("❌ Unhandled error in image upload:", {
      message: error.message,
      stack: error.stack,
    });

    if (uploadResult && uploadResult.filePath) {
      try {
        console.log("🧹 Final cleanup of local file...");
        await localStorage.deleteFile(null, uploadResult.filePath);
      } catch (cleanupError) {
        console.error("❌ Final cleanup failed:", cleanupError);
      }
    }

    if (dbRecord && dbRecord.so_img_id) {
      try {
        console.log("🧹 Final cleanup of database record...");
        await SubOperationImages.destroy({
          where: { so_img_id: dbRecord.so_img_id },
        });
      } catch (dbCleanupError) {
        console.error("❌ Database cleanup failed:", dbCleanupError);
      }
    }

    res.status(500).json({
      message: "Failed to upload image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

exports.deleteImage = async (req, res, next) => {
  const { so_img_id } = req.params;

  console.log("🗑️ [Local] Delete image request for ID:", so_img_id);

  let imageRecord = null;
  let localDeleted = false;
  let localError = null;

  try {
    if (!so_img_id || isNaN(so_img_id)) {
      console.log("❌ Invalid image ID:", so_img_id);
      return res.status(400).json({
        message: "Valid image ID is required",
        success: false,
      });
    }

    try {
      console.log("🔍 Searching for image record in database...");
      imageRecord = await SubOperationImages.findOne({
        where: { so_img_id: so_img_id },
        attributes: [
          "so_img_id",
          "image_url",
          "sub_operation_name",
          "original_filename",
          "file_size",
          "style_id",
          "operation_id",
          "sub_operation_id",
        ],
      });

      if (!imageRecord) {
        console.log("❌ Image record not found for ID:", so_img_id);
        return res.status(404).json({
          message: "Image record not found",
          success: false,
        });
      }

      console.log("✅ Image record found:", {
        id: imageRecord.so_img_id,
        image_url: imageRecord.image_url,
        original_filename: imageRecord.original_filename,
        file_size: imageRecord.file_size,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // ==================== DELETE FROM LOCAL STORAGE ====================
    if (imageRecord.image_url) {
      console.log("🗑️ Deleting from local storage...");

      try {
        await localStorage.deleteFile(null, imageRecord.image_url);
        localDeleted = true;
        console.log("✅ Local deletion successful:", {
          filePath: imageRecord.image_url,
        });
      } catch (localDeleteError) {
        localError = localDeleteError;
        console.error("⚠️ Local deletion failed:", {
          error: localDeleteError.message,
          filePath: imageRecord.image_url,
        });

        if (
          localDeleteError.message.includes("not found") ||
          localDeleteError.code === "ENOENT"
        ) {
          console.log(
            "ℹ️ File not found in local storage (may have been deleted already)",
          );
          localDeleted = true;
        }
      }
    } else {
      console.log("ℹ️ No image URL found, skipping local deletion");
    }

    // ==================== DELETE FROM DATABASE ====================
    let dbDeleted = false;
    try {
      console.log("💾 Deleting database record...");
      await SubOperationImages.destroy({
        where: { so_img_id: so_img_id },
      });
      dbDeleted = true;
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);

      if (localDeleted) {
        console.error(
          "⚠️ WARNING: File deleted from local storage but database record remains!",
        );
        console.error("⚠️ Image data:", {
          image_url: imageRecord.image_url,
          original_filename: imageRecord.original_filename,
        });
      }

      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    console.log("🎉 Image deletion process completed");

    const response = {
      message: "Image deleted successfully",
      success: true,
      data: {
        id: so_img_id,
        filename: imageRecord.original_filename || imageRecord.image_url,
        original_filename: imageRecord.original_filename,
        file_size: imageRecord.file_size,
        local_deleted: localDeleted,
        db_deleted: dbDeleted,
        storage_provider: "local",
      },
    };

    if (localError && !localDeleted) {
      response.warning =
        "Image removed from database but local storage cleanup failed";
      response.warning_details = {
        message: localError.message,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);
    console.error("❌ Error stack:", error.stack);

    let statusCode = 500;
    let errorMessage = "Server error during image deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find image record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete image record from database";

      if (localDeleted) {
        errorMessage +=
          " (WARNING: File was deleted from local storage but database record remains)";
      }
    } else if (error.message.includes("Valid image ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
      debug:
        process.env.NODE_ENV === "development"
          ? {
              image_id: so_img_id,
              local_deleted: localDeleted,
              local_error: localError?.message,
            }
          : undefined,
    });
  }
};

// ==================== TECH PACK CONTROLLERS ====================

async function processTechPackExcel(buffer) {
  try {
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;

    let totalRows = 0;
    const processedSheets = [];

    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const rowCount = sheetData.length;

      processedSheets.push({
        name: sheetName,
        rows: rowCount,
        columns: sheetData[0]?.length || 0,
      });

      totalRows += rowCount;
    }

    return {
      sheetsProcessed: sheetNames.length,
      totalRows: totalRows,
      sheets: processedSheets,
      fileName: workbook.Props?.Title || "Unknown",
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Excel processing error:", error);
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
}

exports.uploadTechPack = async (req, res, next) => {
  console.log("📤 [Local] Tech pack upload request received");

  let uploadResult = null;
  let dbRecord = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleId, styleNo } = req.body;

    if (!styleId) {
      return res.status(400).json({
        message: "styleId is required",
        success: false,
      });
    }

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

    const filename =
      req.file.generatedName ||
      `${styleNo || "STYLE"}_TECHPACK_${dateTime}${ext}`;

    /* -----------------------------------
       Upload To Local Storage
    ----------------------------------- */
    uploadResult = await localStorage.uploadSubOpFile(
      req.file.buffer,
      filename,
      "techpack",
      styleId,
    );

    /* -----------------------------------
       Optional Excel Processing
    ----------------------------------- */
    let excelProcessingResults = null;

    if (ext === ".xlsx" || ext === ".xls") {
      try {
        excelProcessingResults = await processTechPackExcel(req.file.buffer);
      } catch (err) {
        excelProcessingResults = {
          sheetsProcessed: 0,
          totalRows: 0,
          error: err.message,
        };
      }
    }

    /* -----------------------------------
       Save Database Record
    ----------------------------------- */
    dbRecord = await SubOperationTechPack.create({
      style_id: styleId,
      tech_pack_url: uploadResult.filePath,
      file_size: req.file.size,
      original_filename: req.file.originalname,
      uploaded_by: req.user?.userId || null,
      file_type: req.file.mimetype,
    });

    /* -----------------------------------
       Response
    ----------------------------------- */
    return res.status(201).json({
      message: "Tech pack uploaded successfully",
      success: true,
      data: {
        so_tech_id: dbRecord.so_tech_id,
        style_id: dbRecord.style_id,
        tech_pack_url: uploadResult.filePath,
        tech_pack_url_proxy: `/api/local-files/${uploadResult.filePath}`,
        original_filename: dbRecord.original_filename,
        file_size: dbRecord.file_size,
        file_type: dbRecord.file_type,
        uploaded_at: dbRecord.createdAt,
        excel_processing: excelProcessingResults,
      },
      storage: {
        type: "local",
        path: "/mnt/bulletin-assets",
      },
    });
  } catch (error) {
    console.error("❌ Tech pack upload failed:", error);

    if (uploadResult?.filePath) {
      try {
        await localStorage.deleteFile(null, uploadResult.filePath);
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
    }

    if (dbRecord?.so_tech_id) {
      await SubOperationTechPack.destroy({
        where: { so_tech_id: dbRecord.so_tech_id },
      });
    }

    return res.status(500).json({
      message: "Failed to upload tech pack",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.deleteTechPack = async (req, res, next) => {
  const { so_tech_id } = req.params;

  console.log("🗑️ [Local] Delete tech pack request for ID:", so_tech_id);

  let techPackRecord = null;
  let localDeleted = false;
  let localError = null;

  try {
    if (!so_tech_id || isNaN(so_tech_id)) {
      console.log("❌ Invalid tech pack ID:", so_tech_id);
      return res.status(400).json({
        message: "Valid tech pack ID is required",
        success: false,
      });
    }

    try {
      console.log("🔍 Searching for tech pack record in database...");
      techPackRecord = await SubOperationTechPack.findOne({
        where: { so_tech_id: so_tech_id },
        attributes: [
          "so_tech_id",
          "tech_pack_url",
          "original_filename",
          "file_size",
          "style_id",
        ],
      });

      if (!techPackRecord) {
        console.log("❌ Tech pack record not found for ID:", so_tech_id);
        return res.status(404).json({
          message: "Tech pack record not found",
          success: false,
        });
      }

      console.log("✅ Tech pack record found:", {
        id: techPackRecord.so_tech_id,
        tech_pack_url: techPackRecord.tech_pack_url,
        original_filename: techPackRecord.original_filename,
        file_size: techPackRecord.file_size,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // ==================== DELETE FROM LOCAL STORAGE ====================
    if (techPackRecord.tech_pack_url) {
      console.log("🗑️ Deleting from local storage...");

      try {
        await localStorage.deleteFile(null, techPackRecord.tech_pack_url);
        localDeleted = true;
        console.log("✅ Local deletion successful");
      } catch (localDeleteError) {
        localError = localDeleteError;
        console.error("⚠️ Local deletion failed:", localDeleteError.message);

        if (
          localDeleteError.message.includes("not found") ||
          localDeleteError.code === "ENOENT"
        ) {
          console.log(
            "ℹ️ File not found in local storage (may have been deleted already)",
          );
          localDeleted = true;
        }
      }
    } else {
      console.log("ℹ️ No tech pack URL, skipping local deletion");
    }

    // ==================== DELETE FROM DATABASE ====================
    let dbDeleted = false;
    try {
      console.log("💾 Deleting database record...");
      await SubOperationTechPack.destroy({
        where: { so_tech_id: so_tech_id },
      });
      dbDeleted = true;
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    console.log("🎉 Tech pack deletion completed");

    const response = {
      message: "Tech pack deleted successfully",
      success: true,
      data: {
        id: so_tech_id,
        filename:
          techPackRecord.original_filename || techPackRecord.tech_pack_url,
        local_deleted: localDeleted,
        db_deleted: dbDeleted,
        storage_provider: "local",
      },
    };

    if (localError && !localDeleted) {
      response.warning =
        "Tech pack removed from database but local storage cleanup failed";
      response.warning_details = {
        message: localError.message,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);

    let statusCode = 500;
    let errorMessage = "Server error during tech pack deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find tech pack record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete tech pack record from database";
    } else if (error.message.includes("Valid tech pack ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// ==================== FOLDER CONTROLLERS ====================

exports.uploadFolder = async (req, res) => {
  console.log("📤 [Local] Folder upload request received", req.body);

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
        success: false,
      });
    }

    const { styleId, styleNo, folderName } = req.body;

    if (!styleId) {
      return res.status(400).json({
        message: "styleId is required",
        success: false,
      });
    }

    console.log(
      `📦 Processing ${req.files.length} files for styleId: ${styleId}`,
    );

    const uploadResults = [];
    const failedFiles = [];
    const filesToCleanup = [];

    for (const [index, file] of req.files.entries()) {
      let uploadResult;
      let dbRecord;

      try {
        const ext = path.extname(file.originalname).toLowerCase();

        const now = new Date();
        const dateTime = `${now.getFullYear()}${String(
          now.getMonth() + 1,
        ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
          now.getHours(),
        ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
          now.getSeconds(),
        ).padStart(2, "0")}`;

        const filename = `${styleNo || "STYLE"}_${folderName || "FOLDER"}_${dateTime}_${index}${ext}`;

        if (!file.buffer || file.buffer.length === 0) {
          throw new Error("File buffer is empty");
        }

        /* ---------------- Upload to Local Storage ---------------- */
        uploadResult = await localStorage.uploadSubOpFile(
          file.buffer,
          filename,
          "document",
          styleId,
        );

        filesToCleanup.push({
          filePath: uploadResult.filePath,
        });

        /* ---------------- Save DB ---------------- */
        dbRecord = await SubOperationFolder.create({
          style_id: styleId,
          folder_url: uploadResult.filePath,
          file_size: file.size,
          original_filename: file.originalname,
          uploaded_by: req.user?.userId || null,
          file_type: file.mimetype,
        });

        uploadResults.push({
          id: dbRecord.so_folder_id,
          originalName: file.originalname,
          savedName: filename,
          filePath: uploadResult.filePath,
          size: file.size,
          type: file.mimetype,
          status: "success",
        });
      } catch (err) {
        console.error(`❌ File failed: ${file.originalname}`, err.message);

        failedFiles.push({
          originalName: file.originalname,
          error: err.message,
          status: "failed",
        });

        if (uploadResult?.filePath) {
          try {
            await localStorage.deleteFile(null, uploadResult.filePath);
          } catch (_) {}
        }
      }
    }

    if (uploadResults.length === 0) {
      return res.status(500).json({
        message: "All files failed to upload",
        success: false,
        failedFiles,
      });
    }

    return res.status(201).json({
      message: `${uploadResults.length} files uploaded successfully`,
      success: true,
      files: uploadResults,
      failedFilesCount: failedFiles.length,
      storage: {
        type: "local",
        path: "/mnt/bulletin-assets",
      },
    });
  } catch (error) {
    console.error("❌ Upload process failed:", error);

    return res.status(500).json({
      message: "Folder upload failed",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.deleteFolderDocument = async (req, res, next) => {
  const { so_folder_id } = req.params;

  console.log("🗑️ [Local] Delete folder file request for ID:", so_folder_id);

  let folderFileRecord = null;
  let localDeleted = false;
  let localError = null;

  try {
    if (!so_folder_id || isNaN(so_folder_id)) {
      console.log("❌ Invalid folder file ID:", so_folder_id);
      return res.status(400).json({
        message: "Valid folder file ID is required",
        success: false,
      });
    }

    try {
      console.log("🔍 Searching for folder file record in database...");
      folderFileRecord = await SubOperationFolder.findOne({
        where: { so_folder_id: so_folder_id },
        attributes: [
          "so_folder_id",
          "folder_url",
          "original_filename",
          "file_size",
          "style_id",
        ],
      });

      if (!folderFileRecord) {
        console.log("❌ Folder file record not found for ID:", so_folder_id);
        return res.status(404).json({
          message: "Folder file record not found",
          success: false,
        });
      }

      console.log("✅ Folder file record found:", {
        id: folderFileRecord.so_folder_id,
        folder_url: folderFileRecord.folder_url,
        original_filename: folderFileRecord.original_filename,
        file_size: folderFileRecord.file_size,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // ==================== DELETE FROM LOCAL STORAGE ====================
    if (folderFileRecord.folder_url) {
      console.log("🗑️ Deleting from local storage...");

      try {
        await localStorage.deleteFile(null, folderFileRecord.folder_url);
        localDeleted = true;
        console.log("✅ Local deletion successful");
      } catch (localDeleteError) {
        localError = localDeleteError;
        console.error("⚠️ Local deletion failed:", localDeleteError.message);

        if (
          localDeleteError.message.includes("not found") ||
          localDeleteError.code === "ENOENT"
        ) {
          console.log(
            "ℹ️ File not found in local storage (may have been deleted already)",
          );
          localDeleted = true;
        }
      }
    } else {
      console.log("ℹ️ No folder URL, skipping local deletion");
    }

    // ==================== DELETE FROM DATABASE ====================
    let dbDeleted = false;
    try {
      console.log("💾 Deleting database record...");
      await SubOperationFolder.destroy({
        where: { so_folder_id: so_folder_id },
      });
      dbDeleted = true;
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    console.log("🎉 Folder file deletion completed");

    const response = {
      message: "Folder file deleted successfully",
      success: true,
      data: {
        id: so_folder_id,
        filename:
          folderFileRecord.original_filename || folderFileRecord.folder_url,
        local_deleted: localDeleted,
        db_deleted: dbDeleted,
        storage_provider: "local",
      },
    };

    if (localError && !localDeleted) {
      response.warning =
        "Folder file removed from database but local storage cleanup failed";
      response.warning_details = {
        message: localError.message,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);

    let statusCode = 500;
    let errorMessage = "Server error during folder file deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find folder file record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete folder file record from database";
    } else if (error.message.includes("Valid folder file ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

exports.deleteMultipleFolderDocuments = async (req, res, next) => {
  const { documentIds } = req.body;

  console.log(
    "🗑️ Delete multiple folder documents request for IDs:",
    documentIds,
  );

  try {
    if (
      !documentIds ||
      !Array.isArray(documentIds) ||
      documentIds.length === 0
    ) {
      console.log("❌ No document IDs provided");
      return res.status(400).json({
        message: "No document IDs provided",
        success: false,
      });
    }

    const deleteResults = [];

    for (const docId of documentIds) {
      try {
        console.log(`\n🔍 Processing deletion for ID: ${docId}`);

        const folderRecord = await SubOperationFolder.findOne({
          where: { so_folder_id: docId },
        });

        if (!folderRecord) {
          console.log("❌ Folder document record not found for ID:", docId);
          deleteResults.push({
            id: docId,
            status: "not_found",
            error: "Record not found",
          });
          continue;
        }

        let fileDeleted = false;

        // Delete file from local storage
        if (folderRecord.folder_url) {
          try {
            await localStorage.deleteFile(null, folderRecord.folder_url);
            fileDeleted = true;
            console.log("✅ File deleted from local storage");
          } catch (fileError) {
            console.error("❌ File deletion error:", fileError);
          }
        }

        // Delete database record
        await SubOperationFolder.destroy({
          where: { so_folder_id: docId },
        });

        console.log("✅ Database record deleted");
        deleteResults.push({
          id: docId,
          filename: folderRecord.folder_url,
          fileDeleted: fileDeleted,
          recordDeleted: true,
          status: "success",
        });
      } catch (error) {
        console.error(`❌ Error deleting document ${docId}:`, error.message);
        deleteResults.push({
          id: docId,
          status: "error",
          error: error.message,
        });
      }
    }

    const successfulDeletes = deleteResults.filter(
      (r) => r.status === "success",
    ).length;
    const failedDeletes = deleteResults.filter(
      (r) => r.status === "error",
    ).length;
    const notFound = deleteResults.filter(
      (r) => r.status === "not_found",
    ).length;

    console.log(
      `\n📊 Bulk delete summary: ${successfulDeletes} successful, ${failedDeletes} failed, ${notFound} not found`,
    );

    res.json({
      message: `Bulk delete completed: ${successfulDeletes} documents deleted successfully`,
      success: true,
      results: deleteResults,
      summary: {
        total: documentIds.length,
        successful: successfulDeletes,
        failed: failedDeletes,
        notFound: notFound,
      },
    });
  } catch (error) {
    console.error("❌ Bulk delete process failed:", error.message);
    res.status(500).json({
      message: "Server error during bulk deletion",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// ==================== GET CONTROLLERS ====================

exports.getImages = async (req, res) => {
  try {
    const { subOpId } = req.params;

    if (!subOpId) {
      return res.status(400).json({
        success: false,
        message: "subOpId parameter is required",
      });
    }

    console.log(`📸 Fetching images for subOpId: ${subOpId}`);

    const images = await SubOperationImages.findAll({
      where: { sub_operation_id: subOpId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "so_img_id",
        "sub_operation_id",
        "sub_operation_name",
        "image_url",
        "file_size",
        "original_filename",
        "file_type",
        "uploaded_by",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log(`✅ Found ${images.length} images for subOpId: ${subOpId}`);

    const imagesWithUrls = images.map((image) => {
      const imageData = image.toJSON();

      const proxyUrl = `/api/local-files/${imageData.image_url}`;

      return {
        ...imageData,
        public_url: proxyUrl,
        proxy_url: proxyUrl,
        direct_url: proxyUrl,
        preview_url: proxyUrl,
      };
    });

    res.json({
      success: true,
      data: imagesWithUrls,
      count: images.length,
      message: "Images fetched successfully",
      storage: {
        type: "local",
        path: "/mnt/bulletin-assets",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching images:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch images",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getStyleTechPacks = async (req, res) => {
  try {
    const { subOpId: styleId } = req.params;
    console.log("requested style id: ", styleId);

    if (!styleId) {
      return res.status(400).json({
        success: false,
        message: "styleId parameter is required",
      });
    }

    console.log(`📋 Fetching tech packs for styleId: ${styleId}`);

    const techPacks = await SubOperationTechPack.findAll({
      where: { style_id: styleId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "so_tech_id",
        "style_id",
        "tech_pack_url",
        "file_size",
        "original_filename",
        "file_type",
        "uploaded_by",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log(
      `✅ Found ${techPacks.length} tech packs for styleId: ${styleId}`,
    );

    const techPacksWithUrls = techPacks.map((techPack) => {
      const techPackData = techPack.toJSON();

      const proxyUrl = `/api/local-files/${techPackData.tech_pack_url}`;
      const fileIcon = getFileIcon(
        techPackData.original_filename || techPackData.tech_pack_url,
      );

      return {
        ...techPackData,
        public_url: proxyUrl,
        proxy_url: proxyUrl,
        direct_url: proxyUrl,
        preview_url: proxyUrl,
        file_icon: fileIcon,
        file_name:
          techPackData.original_filename ||
          techPackData.tech_pack_url?.split("/").pop() ||
          "techpack.xlsx",
        file_extension: getFileExtension(
          techPackData.original_filename || techPackData.tech_pack_url,
        ),
        file_size_formatted: formatFileSize(techPackData.file_size),
      };
    });

    res.json({
      success: true,
      data: techPacksWithUrls,
      count: techPacks.length,
      message: "Style tech packs fetched successfully",
      storage: {
        type: "local",
        path: "/mnt/bulletin-assets",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching style tech packs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch style tech packs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getFolderDocuments = async (req, res) => {
  try {
    const { styleId } = req.params;

    if (!styleId) {
      return res.status(400).json({
        success: false,
        message: "styleId parameter is required",
      });
    }

    console.log(`📂 Fetching folder files for styleId: ${styleId}`);

    const folderFiles = await SubOperationFolder.findAll({
      where: { style_id: styleId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "so_folder_id",
        "style_id",
        "folder_url",
        "file_size",
        "original_filename",
        "file_type",
        "uploaded_by",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log(
      `✅ Found ${folderFiles.length} folder files for styleId: ${styleId}`,
    );

    const folderFilesWithUrls = folderFiles.map((folderFile) => {
      const folderFileData = folderFile.toJSON();

      const proxyUrl = folderFileData.folder_url
        ? `/api/local-files/${folderFileData.folder_url}`
        : null;

      const fileName =
        folderFileData.original_filename ||
        folderFileData.folder_url?.split("/").pop() ||
        "file";

      return {
        ...folderFileData,
        public_url: proxyUrl,
        proxy_url: proxyUrl,
        direct_url: proxyUrl,
        preview_url: proxyUrl,
        file_name: fileName,
        file_extension: getFileExtension(fileName),
        file_icon: getFileIcon(fileName),
        file_type_name: getFileType(folderFileData.file_type || fileName),
        file_size_formatted: formatFileSize(folderFileData.file_size),
      };
    });

    return res.json({
      success: true,
      data: folderFilesWithUrls,
      count: folderFiles.length,
      message: "Folder files fetched successfully",
      storage: {
        type: "local",
        path: "/mnt/bulletin-assets",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching folder files:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch folder files",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

function getFileIcon(filename) {
  if (!filename) return "📄";
  const ext = getFileExtension(filename).toLowerCase();
  const iconMap = {
    ".pdf": "📕",
    ".doc": "📘",
    ".docx": "📘",
    ".txt": "📝",
    ".zip": "🗜️",
    ".rar": "🗜️",
    ".7z": "🗜️",
    ".jpg": "🖼️",
    ".jpeg": "🖼️",
    ".png": "🖼️",
    ".gif": "🖼️",
    ".xlsx": "📊",
    ".xls": "📊",
    ".csv": "📑",
  };
  return iconMap[ext] || "📄";
}

function getFileExtension(filename) {
  if (!filename) return "";
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.substring(lastDot);
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileType(mimeTypeOrFilename) {
  if (!mimeTypeOrFilename) return "Document";

  if (mimeTypeOrFilename.includes("/")) {
    const parts = mimeTypeOrFilename.split("/");
    return parts[1] ? parts[1].toUpperCase() : "Document";
  } else {
    const ext = getFileExtension(mimeTypeOrFilename).toLowerCase();
    const typeMap = {
      ".pdf": "PDF Document",
      ".doc": "Word Document",
      ".docx": "Word Document",
      ".txt": "Text File",
      ".zip": "Archive",
      ".rar": "Archive",
      ".7z": "Archive",
      ".jpg": "Image",
      ".jpeg": "Image",
      ".png": "Image",
      ".gif": "Image",
      ".xlsx": "Excel Spreadsheet",
      ".xls": "Excel Spreadsheet",
      ".csv": "CSV File",
    };
    return typeMap[ext] || "Document";
  }
}
